/**
 * Grounded AI Agent Service
 *
 * Implements Review 4 & 5 bounded agent workflow:
 * 1. Reads approved proposal baseline and deliverables
 * 2. Retrieves semantic scope passages via RAG (project-specific only)
 * 3. Compares request against evidence using model interface
 * 4. Calculates effort/schedule using explicit deterministic tool
 * 5. Validates complete output with Zod and attaches human-review notice
 *
 * AUDIT FIX — Project Retrieval Isolation:
 *   Retrieval is always scoped to passages built from the *current project's*
 *   proposal and deliverables. On retrieval failure the service returns an
 *   explicit `uncertain` result instead of silently substituting unrelated
 *   global-corpus evidence.
 *
 * AUDIT FIX — Contradictory Evidence Guard:
 *   If a model classifies a request as `in_scope` but no passage scores above
 *   STRONG_MATCH_THRESHOLD, the classification is overridden to `uncertain`
 *   with a billing-safe null effort calculation.
 */

const { defaultRetrievalService, STRONG_MATCH_THRESHOLD } = require('../rag/retrieval.service');
const { CorpusService } = require('../rag/corpus.service');
const { defaultEffortCalculator } = require('../tools/effortCalculator.tool');
const { defaultProviderFactory } = require('../providers/providerFactory');
const {
  GroundedAgentInputSchema,
  GroundedAgentOutputSchema,
  ProviderComparisonOutputSchema,
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
   * @param {Object} [options] - Runtime options (e.g. { suppressBilling: true })
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
    // Build dynamic passages strictly from this project's runtime deliverables & proposal.
    // NEVER fall back to the global static corpus — that would mix unrelated project data.
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
      // Retrieval entirely failed — return safe uncertain result without calling external model
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
        comparisonResult = ProviderComparisonOutputSchema
          ? ProviderComparisonOutputSchema.parse(rawComparison)
          : rawComparison;
      } catch {
        // Graceful fallback to local reasoner if external model fails, times out, or returns invalid schema
        fallbackUsed = true;
        const rawLocal = await this.providerFactory.localProvider.generateComparison({
          newClientRequest,
          retrievedPassages,
          approvedProposalVersion,
          deliverables,
        });
        comparisonResult = ProviderComparisonOutputSchema
          ? ProviderComparisonOutputSchema.parse(rawLocal)
          : rawLocal;
      }
    }

    // ── AUDIT FIX — Contradictory Evidence Guard (B2) ──────────────────────
    // Checks ALL retrieved passages, not only the top similarity score:
    //
    // Rule 1 — Insufficient evidence: if the model says `in_scope` but no
    //   passage scores above STRONG_MATCH_THRESHOLD, override to `uncertain`.
    //
    // Rule 2 — Contradictory evidence: if any retrieved passage explicitly
    //   signals exclusion or explicit out-of-scope language (e.g. "excluded",
    //   "not in scope", "change order required"), downgrade in_scope claims to
    //   `needs_clarification` so a human reviews the contradiction.
    //
    // This prevents a high-similarity but irrelevant or contradictory passage
    // from producing an automatic in_scope approval.
    if (comparisonResult.reviewStatus === 'in_scope') {
      const topEvidenceScore = retrievedPassages[0]?.similarityScore || 0;
      const hasStrongEvidence = topEvidenceScore >= STRONG_MATCH_THRESHOLD;

      // Exclusion signal patterns that indicate the passage contradicts in_scope
      const EXCLUSION_PATTERNS = [
        /\bexclud/i,
        /\bnot (in|part of) scope\b/i,
        /\bout.?of.?scope\b/i,
        /\bchange.?order (required|needed)\b/i,
        /\bnot covered\b/i,
        /\bnot included\b/i,
        /\bbeyond (the )?scope\b/i,
        /\bphase [2-9]\b/i,
        /\bfuture (phase|work|release)\b/i,
      ];

      const contradictoryPassage = retrievedPassages.find((p) =>
        EXCLUSION_PATTERNS.some((re) => re.test(p.passageText || ''))
      );

      if (!hasStrongEvidence) {
        // Rule 1: no strong evidence → uncertain
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
              missingEvidence:
                'No sufficiently relevant passage in the approved baseline supports a definitive classification.',
            },
          ],
          affectedDeliverables: [],
          suggestedQuestions: [
            'Which approved deliverable or acceptance criterion does this request relate to?',
            'Does this request require technical discovery or a formal change-order estimate?',
          ],
        };
      } else if (contradictoryPassage) {
        // Rule 2: strong match but contradictory/exclusion passage found → needs_clarification
        comparisonResult = {
          ...comparisonResult,
          summary: `Evidence conflict for "${newClientRequest.title}": a supporting passage exists but another passage signals exclusion or out-of-scope language. Human review required.`,
          reviewStatus: 'needs_clarification',
          inScopeItems: [],
          uncertainItems: [
            {
              item: newClientRequest.title,
              question:
                'A retrieved scope passage contradicts or qualifies inclusion. Can the project manager confirm whether this is in scope?',
              missingEvidence: `Contradictory passage: "${contradictoryPassage.sourceReference}: ${(contradictoryPassage.passageText || '').slice(0, 120)}..."`,
            },
          ],
          suggestedQuestions: [
            'Does the referenced exclusion clause apply to this specific request?',
            'Was this capability deferred to a future phase or separate change order?',
          ],
        };
      }
    }

    // ── STEP 4: Deterministic Effort & Schedule Tool Calculation ────────────
    const effortCalculation = this.effortCalculator.calculate(
      {
        reviewStatus: comparisonResult.reviewStatus,
        outOfScopeItemsCount: (comparisonResult.outOfScopeItems || []).length,
        affectedDeliverablesCount: (comparisonResult.affectedDeliverables || []).length,
        storedHourlyRate,
      },
      options
    );

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
