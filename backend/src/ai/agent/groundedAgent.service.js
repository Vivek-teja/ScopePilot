/**
 * Grounded AI Agent Service
 *
 * Implements Review 4 & 5 bounded agent workflow:
 * 1. Reads approved proposal baseline and deliverables
 * 2. Retrieves semantic scope passages via RAG
 * 3. Compares request against evidence using model interface
 * 4. Calculates effort/schedule using explicit deterministic tool
 * 5. Validates complete output with Zod and attaches human-review notice
 */

const { defaultRetrievalService } = require('../rag/retrieval.service');
const { CorpusService } = require('../rag/corpus.service');
const { defaultEffortCalculator } = require('../tools/effortCalculator.tool');
const { defaultProviderFactory } = require('../providers/providerFactory');
const {
  GroundedAgentInputSchema,
  GroundedAgentOutputSchema,
  ProviderComparisonOutputSchema,
} = require('../../contracts/agentAnalysis.contract');
const { STRONG_MATCH_THRESHOLD } = require('../rag/retrieval.service');

class GroundedAgentService {
  constructor(options = {}) {
    this.providerFactory = options.providerFactory || defaultProviderFactory;
    this.retrievalService = options.retrievalService || defaultRetrievalService;
    this.effortCalculator = options.effortCalculator || defaultEffortCalculator;
  }

  /**
   * Run end-to-end grounded scope change analysis
   * @param {Object} input - GroundedAgentInput
   * @returns {Promise<Object>} GroundedAgentOutput validated by Zod
   */
  async analyze(input, options = {}) {
    const startTime = process.hrtime.bigint();
    const validatedInput = GroundedAgentInputSchema.parse(input);

    const {
      projectId,
      approvedProposalVersion,
      deliverables,
      newClientRequest,
      preferredProvider,
      storedHourlyRate,
      topK,
      minRetrievalThreshold,
    } = validatedInput;

    // ── STEP 1 & 2: Dynamic Semantic Retrieval (RAG) ────────────────────────
    // Build dynamic passages strictly from this project's runtime deliverables & proposal
    let retrievedPassages = [];
    let retrievalFailed = false;
    try {
      const dynamicCorpus = new CorpusService([]);
      const projectPassages = dynamicCorpus.buildPassagesFromProposalAndDeliverables(
        approvedProposalVersion,
        deliverables
      );

      // Search natural language query strictly against project-specific passages
      const query = `${newClientRequest.title} ${newClientRequest.description}`.trim();
      const searchRes = this.retrievalService.retrieve(
        {
          query,
          topK,
          minThreshold: minRetrievalThreshold,
        },
        projectPassages
      );

      retrievedPassages = searchRes.retrievedPassages || [];
    } catch {
      // Safe fallback: on retrieval failure, return empty evidence and explicit uncertain outcome.
      // NEVER silently substitute unrelated canonical scope evidence.
      retrievalFailed = true;
      retrievedPassages = [];
    }

    // ── STEP 3: Model Comparison via Provider Interface ─────────────────────
    const { provider, fallbackUsed: initialFallback } =
      await this.providerFactory.getProvider(preferredProvider);

    let comparisonResult;
    let fallbackUsed = initialFallback;

    if (retrievalFailed) {
      comparisonResult = {
        summary: `Project scope retrieval failed for "${newClientRequest.title}". Human clarification required.`,
        reviewStatus: 'uncertain',
        confidenceScore: 0.5,
        inScopeItems: [],
        outOfScopeItems: [],
        uncertainItems: [
          {
            item: newClientRequest.title,
            question: 'Can the client or project manager clarify how this request maps to project deliverables?',
            missingEvidence: 'Retrieval failure: project scope evidence could not be retrieved from baseline.',
          },
        ],
        affectedDeliverables: [],
        suggestedQuestions: [
          'Which approved deliverable does this request relate to?',
        ],
      };
    } else {
      try {
        const rawComparison = await provider.generateComparison({
          newClientRequest,
          retrievedPassages,
          approvedProposalVersion,
          deliverables,
        });
        comparisonResult = ProviderComparisonOutputSchema.parse(rawComparison);
      } catch {
        // Graceful fallback to local reasoner if external model fails, times out, or returns invalid schema
        fallbackUsed = true;
        const rawLocal = await this.providerFactory.localProvider.generateComparison({
          newClientRequest,
          retrievedPassages,
          approvedProposalVersion,
          deliverables,
        });
        comparisonResult = ProviderComparisonOutputSchema.parse(rawLocal);
      }
    }

    const topEvidenceScore = retrievedPassages[0]?.similarityScore || 0;
    const hasStrongEvidence = topEvidenceScore >= STRONG_MATCH_THRESHOLD;

    if (
      comparisonResult.reviewStatus === 'in_scope' &&
      !hasStrongEvidence
    ) {
      comparisonResult = {
        ...comparisonResult,
        summary: `Insufficient approved-scope evidence to classify "${newClientRequest.title}" definitively.`,
        reviewStatus: 'uncertain',
        inScopeItems: [],
        outOfScopeItems: [],
        uncertainItems: [
          {
            item: newClientRequest.title,
            question: 'Can the client clarify how this request relates to the approved project scope?',
            missingEvidence: 'No sufficiently relevant passage in the approved baseline supports a definitive classification.',
          },
        ],
        affectedDeliverables: [],
        suggestedQuestions: [
          'Which approved deliverable or acceptance criterion does this request relate to?',
          'Does this request require technical discovery or a formal change-order estimate?',
        ],
      };
    }

    // ── STEP 4: Deterministic Effort & Schedule Tool Calculation ────────────
    const effortCalculation = this.effortCalculator.calculate({
      reviewStatus: comparisonResult.reviewStatus,
      outOfScopeItemsCount: (comparisonResult.outOfScopeItems || []).length,
      affectedDeliverablesCount: (comparisonResult.affectedDeliverables || []).length,
      storedHourlyRate,
    }, options);

    // ── STEP 5: Assemble & Validate Grounded Output ─────────────────────────
    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number((endTime - startTime) / 1000000n);

    const analysisId = `analysis_${projectId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const candidateOutput = {
      analysisId,
      summary: comparisonResult.summary,
      reviewStatus: comparisonResult.reviewStatus,
      confidenceScore: comparisonResult.confidenceScore,
      retrievedEvidence: retrievedPassages,
      inScopeItems: comparisonResult.inScopeItems || [],
      outOfScopeItems: comparisonResult.outOfScopeItems || [],
      uncertainItems: comparisonResult.uncertainItems || [],
      affectedDeliverables: comparisonResult.affectedDeliverables || [],
      effortCalculation,
      suggestedQuestions: comparisonResult.suggestedQuestions || [],
      humanReviewDraftNotice:
        'ADVISORY DRAFT ONLY: This analysis is generated as a structured recommendation for human project managers and clients. The AI agent holds zero authority to approve or reject change requests. Final contractual decisions remain with authorized project participants.',
      modelMetadata: {
        provider: fallbackUsed ? 'local' : provider.name,
        modelName: provider.modelName || 'grounded-model',
        executionTimeMs,
        fallbackUsed,
        isDeterministic: provider.name === 'local' || fallbackUsed,
      },
      analyzedAt: new Date().toISOString(),
    };

    // Strict Zod schema validation
    return GroundedAgentOutputSchema.parse(candidateOutput);
  }
}

const defaultGroundedAgentService = new GroundedAgentService();

module.exports = {
  GroundedAgentService,
  defaultGroundedAgentService,
};
