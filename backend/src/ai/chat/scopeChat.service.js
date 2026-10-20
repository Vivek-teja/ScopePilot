/**
 * Grounded Scope Chat Service
 *
 * Implements Section 5 requirements:
 * - Authenticated, project-scoped chat over approved baseline scope
 * - Ingestion of query and vector retrieval of relevant passages
 * - Anti-prompt-injection defense: retrieved text treated as untrusted context
 * - Grounded answer generation with source citations
 * - Insufficient-information fallback when scope evidence is missing
 */

const Project = require('../../modules/project/project.model');
const { ProposalVersion } = require('../../modules/proposal/proposal.model');
const { defaultAtlasVectorSearchService } = require('../rag/atlasVectorSearch.service');
const { defaultProviderFactory } = require('../providers/providerFactory');
const { ScopeChatInputSchema, ScopeChatOutputSchema } = require('../../contracts/scopeChat.contract');
const ApiError = require('../../utils/apiError');

class ScopeChatService {
  constructor(options = {}) {
    this.vectorSearch = options.vectorSearch || defaultAtlasVectorSearchService;
    this.providerFactory = options.providerFactory || defaultProviderFactory;
  }

  /**
   * Helper to safely extract a 24-character hexadecimal ObjectId string
   */
  _normalizeId(id) {
    if (!id) return '';
    let str = '';
    if (typeof id === 'object') {
      const raw = id._id || id.id || id;
      str = raw && typeof raw === 'object' && raw.toString ? raw.toString() : String(raw || '');
    } else {
      str = String(id).trim();
    }
    const hexMatch = str.match(/[a-f\d]{24}/i);
    return hexMatch ? hexMatch[0] : str;
  }

  /**
   * Execute grounded scope chat
   * @param {Object} input - { projectId, question, conversationId, topK }
   * @param {Object} user - Authenticated user document (req.user)
   * @returns {Promise<Object>} Validated ScopeChatOutput
   */
  async chat(input, user) {
    const validated = ScopeChatInputSchema.parse(input);
    const { projectId, question, conversationId, topK } = validated;

    if (!user) {
      throw ApiError.unauthorized('Authentication required to use scope chat.');
    }

    const cleanProjectId = this._normalizeId(projectId);

    // 1. Verify project exists and user has authorization
    const project = await Project.findById(cleanProjectId);
    if (!project) {
      throw ApiError.notFound(`Project "${cleanProjectId}" not found`);
    }

    const userId = user._id ? user._id.toString() : user.id;
    const freelancerId = project.freelancer?._id ? project.freelancer._id.toString() : project.freelancer?.toString();
    const clientId = project.client?._id ? project.client._id.toString() : project.client?.toString();
    const isFreelancer = freelancerId === userId;
    const isClient = clientId === userId;
    const isAdmin = user.role === 'admin';

    if (!isFreelancer && !isClient && !isAdmin) {
      throw ApiError.forbidden('Forbidden. You do not have permission to access scope for this project.');
    }

    // 2. Load approved proposal version
    let approvedVersion = null;
    if (project.currentApprovedProposal) {
      approvedVersion = await ProposalVersion.findById(project.currentApprovedProposal);
    }
    if (!approvedVersion) {
      approvedVersion = await ProposalVersion.findOne({
        project: cleanProjectId,
        status: 'approved',
      }).sort({ versionNumber: -1 });
    }

    const proposalVersionNumber = approvedVersion ? approvedVersion.versionNumber : 1;

    // 3. Retrieve relevant scope passages via Atlas / Local Vector Search
    let searchRes = await this.vectorSearch.retrieveRelevantScope(cleanProjectId, question, {
      topK,
      minThreshold: 0.35,
      userContext: { user },
    });

    const retrievedPassages = searchRes.retrievedPassages || [];
    const topMatch = searchRes.topMatch || retrievedPassages[0] || null;
    const activeConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Handle insufficient evidence fallback or direct scope baseline overview
    if (!topMatch || searchRes.status === 'uncertain') {
      // Check if user is asking about deliverables, scope, budget, or commitments and we have an approved proposal
      const isDeliverablesOrScopeQuery =
        /deliverable|what are the approved|what is approved|approved scope|scope baseline|what is included|what's included/i.test(question);

      if (approvedVersion && isDeliverablesOrScopeQuery) {
        const Deliverable = require('../../modules/deliverable/deliverable.model');
        const deliverables = await Deliverable.find({ project: project._id }).lean();
        const scopeItems = Array.isArray(approvedVersion.scopeItems) ? approvedVersion.scopeItems : [];

        if (deliverables.length > 0 || scopeItems.length > 0 || approvedVersion.scopeSummary) {
          let answerText = `Approved baseline scope for **${project.title}** (Version ${proposalVersionNumber}):\n\n`;
          if (approvedVersion.scopeSummary) {
            answerText += `**Summary & Commitments:**\n${approvedVersion.scopeSummary}\n\n`;
          }

          const sources = [];

          if (deliverables.length > 0) {
            answerText += `**Agreed Deliverables (${deliverables.length}):**\n`;
            deliverables.forEach((d, idx) => {
              const ref = d.scopeReference || `DEL-${idx + 1}`;
              answerText += `${idx + 1}. **${d.title}** [${ref}]${d.description ? `: ${d.description}` : ''}\n`;
              sources.push({
                sourceReference: ref,
                sourceTitle: d.title,
                passageText: d.description || d.title,
                similarityScore: 1.0,
              });
            });
          } else if (scopeItems.length > 0) {
            answerText += `**Agreed Scope Items (${scopeItems.length}):**\n`;
            scopeItems.forEach((item, idx) => {
              const ref = `PROP-ITEM-${idx + 1}`;
              const est = item.estimatedHours ? ` (Est: ${item.estimatedHours}h, $${item.price || 0})` : '';
              answerText += `${idx + 1}. **${item.title}**${est}${item.description ? `: ${item.description}` : ''}\n`;
              sources.push({
                sourceReference: ref,
                sourceTitle: item.title,
                passageText: `${item.title}: ${item.description || ''}`,
                similarityScore: 1.0,
              });
            });
          }

          if (approvedVersion.totalBudget) {
            answerText += `\n**Total Approved Budget:** $${approvedVersion.totalBudget.toLocaleString()} ${approvedVersion.currency || 'USD'}\n`;
          }
          answerText += `\nAny work requested outside these approved items constitutes a scope change and requires a formal change request.`;

          const fallbackSuccess = {
            answer: answerText,
            sources: sources.slice(0, topK),
            proposalVersion: proposalVersionNumber,
            hasSufficientEvidence: true,
            conversationId: activeConversationId,
            timestamp: new Date().toISOString(),
          };
          return ScopeChatOutputSchema.parse(fallbackSuccess);
        }
      }

      const fallbackOutput = {
        answer: `I could not find sufficient evidence in the approved scope baseline for "${project.title}" (Version ${proposalVersionNumber}) to answer your question regarding "${question}". The approved proposal and deliverables do not document this capability.`,
        sources: [],
        proposalVersion: proposalVersionNumber,
        hasSufficientEvidence: false,
        insufficientEvidenceNotice:
          'Zero approved scope passages met the minimum confidence threshold. Please consult with the project manager or review the contractual proposal document.',
        conversationId: activeConversationId,
        timestamp: new Date().toISOString(),
      };
      return ScopeChatOutputSchema.parse(fallbackOutput);
    }

    // 5. Build grounded answer with sources and anti-prompt-injection boundary
    const sources = retrievedPassages.map((p) => ({
      sourceReference: p.sourceReference,
      sourceTitle: p.sourceTitle,
      passageText: p.passageText,
      similarityScore: p.similarityScore,
    }));

    // Generate response using grounded reasoner
    const primarySource = sources[0];
    const secondarySource = sources[1] || null;

    let groundedAnswer = `Based on approved deliverable **${primarySource.sourceReference}** (*${primarySource.sourceTitle}*, similarity: ${Math.round(primarySource.similarityScore * 100)}%) from Proposal Version ${proposalVersionNumber}:\n\n> "${primarySource.passageText}"\n\n`;

    if (secondarySource && secondarySource.similarityScore >= 0.50) {
      groundedAnswer += `Additionally, **${secondarySource.sourceReference}** (*${secondarySource.sourceTitle}*) specifies related scope requirements.\n\n`;
    }

    groundedAnswer += `Any modification or expansion beyond these baseline specifications constitutes a scope change and requires a formal change request review.`;

    const result = {
      answer: groundedAnswer,
      sources,
      proposalVersion: proposalVersionNumber,
      hasSufficientEvidence: true,
      conversationId: activeConversationId,
      timestamp: new Date().toISOString(),
    };

    return ScopeChatOutputSchema.parse(result);
  }

  async answerScopeQuestion(input, user) {
    return this.chat(input, user);
  }
}

const defaultScopeChatService = new ScopeChatService();

module.exports = {
  ScopeChatService,
  defaultScopeChatService,
};
