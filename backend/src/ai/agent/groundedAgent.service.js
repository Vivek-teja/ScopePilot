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
} = require('../../contracts/agentAnalysis.contract');

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
  async analyze(input) {
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
    // Build dynamic corpus from runtime deliverables & proposal if provided
    let retrievedPassages = [];
    try {
      const dynamicCorpus = new CorpusService([]);
      const passages = dynamicCorpus.buildPassagesFromProposalAndDeliverables(
        approvedProposalVersion,
        deliverables
      );
      dynamicCorpus.indexPassages(passages);

      // Search using query
      const query = `${newClientRequest.title} ${newClientRequest.description}`;
      const searchRes = this.retrievalService.retrieve({
        query,
        topK,
        minThreshold: minRetrievalThreshold,
      });

      retrievedPassages = searchRes.retrievedPassages || [];
    } catch {
      // Fallback to static baseline retrieval
      const searchRes = this.retrievalService.retrieve({
        query: newClientRequest.title,
        topK,
        minThreshold: minRetrievalThreshold,
      });
      retrievedPassages = searchRes.retrievedPassages || [];
    }

    // ── STEP 3: Model Comparison via Provider Interface ─────────────────────
    const { provider, fallbackUsed: initialFallback } =
      await this.providerFactory.getProvider(preferredProvider);

    let comparisonResult;
    let fallbackUsed = initialFallback;

    try {
      comparisonResult = await provider.generateComparison({
        newClientRequest,
        retrievedPassages,
        approvedProposalVersion,
        deliverables,
      });
    } catch {
      // Graceful fallback to local reasoner if external model fails
      fallbackUsed = true;
      comparisonResult = await this.providerFactory.localProvider.generateComparison({
        newClientRequest,
        retrievedPassages,
        approvedProposalVersion,
        deliverables,
      });
    }

    // ── STEP 4: Deterministic Effort & Schedule Tool Calculation ────────────
    const effortCalculation = this.effortCalculator.calculate({
      reviewStatus: comparisonResult.reviewStatus,
      outOfScopeItemsCount: (comparisonResult.outOfScopeItems || []).length,
      affectedDeliverablesCount: (comparisonResult.affectedDeliverables || []).length,
      storedHourlyRate,
    });

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
