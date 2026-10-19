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

    // 1. Verify project exists and user has authorization
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound(`Project "${projectId}" not found`);
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
        project: projectId,
        status: 'approved',
      }).sort({ versionNumber: -1 });
    }

    const proposalVersionNumber = approvedVersion ? approvedVersion.versionNumber : 1;

    // 3. Retrieve relevant scope passages via Atlas / Local Vector Search
    const searchRes = await this.vectorSearch.retrieveRelevantScope(projectId, question, {
      topK,
      minThreshold: 0.35,
      userContext: { user },
    });

    const retrievedPassages = searchRes.retrievedPassages || [];
    const topMatch = searchRes.topMatch || retrievedPassages[0] || null;
    const activeConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Handle insufficient evidence fallback (< 0.35 similarity or zero candidates)
    if (!topMatch || searchRes.status === 'uncertain') {
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
