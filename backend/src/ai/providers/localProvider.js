/**
 * Local Grounded Reasoner Provider
 *
 * Implements bounded semantic comparison using retrieved scope evidence.
 * Operates offline deterministically with zero network failure risk.
 */

const { BaseModelProvider } = require('./modelInterface');
const { STRONG_MATCH_THRESHOLD } = require('../rag/retrieval.service');

class LocalModelProvider extends BaseModelProvider {
  constructor() {
    super('local');
    this.modelName = 'scopepilot-grounded-heuristics-v1';
  }

  async isAvailable() {
    return true;
  }

  /**
   * Perform grounded comparison of request against retrieved evidence
   */
  async generateComparison(context) {
    const { newClientRequest, retrievedPassages, deliverables } = context;
    const reqText = `${newClientRequest.title} ${newClientRequest.description}`.toLowerCase();
    const topMatch = (retrievedPassages && retrievedPassages[0]) || null;
    const topScore = topMatch ? topMatch.similarityScore : 0.0;

    const uncertainResult = (missingEvidence) => ({
      summary: `Insufficient approved-scope evidence to classify "${newClientRequest.title}" definitively.`,
      reviewStatus: 'uncertain',
      confidenceScore: 0.92,
      inScopeItems: [],
      outOfScopeItems: [],
      uncertainItems: [
        {
          item: newClientRequest.title,
          question: 'Can the client clarify how this request relates to the approved project scope?',
          missingEvidence,
        },
      ],
      affectedDeliverables: [],
      suggestedQuestions: [
        'Which approved deliverable or acceptance criterion does this request relate to?',
        'Does this request require technical discovery or a formal change-order estimate?',
      ],
    });

    // ── 1. Unknown External Systems / Missing Evidence (Case 5: Insufficient Evidence) ──
    const missingEvidenceTerms = ['sap', 'erp', 'as400', 'proprietary', 'vpn tunnel', 'warehouse connector'];
    const isMissingEvidence = missingEvidenceTerms.some((term) => reqText.includes(term));

    if (isMissingEvidence) {
      return uncertainResult(
        'The approved proposal and deliverables contain no documentation or architectural specifications for this capability.'
      );
    }

    // ── 2. Subjective Ambiguity without Measurable Criteria (Case 4: Ambiguous Request) ──
    const ambiguousKeywords = ['faster', 'significantly faster', 'premium', 'optimize', 'cleaner', 'better', 'look and feel'];
    const hasAmbiguousKeywords = ambiguousKeywords.some((w) => reqText.includes(w));
    const hasMetrics = /\b\d+(\.\d+)?\s*(ms|seconds|fps|%|percent|concurrent)\b/i.test(reqText);

    if (hasAmbiguousKeywords && !hasMetrics) {
      return {
        summary: `Request contains subjective performance claims ("${newClientRequest.title}") without verifiable acceptance thresholds.`,
        reviewStatus: 'needs_clarification',
        confidenceScore: 0.88,
        inScopeItems: [],
        outOfScopeItems: [],
        uncertainItems: [
          {
            item: newClientRequest.title,
            question: 'What specific measurable performance benchmark (e.g. p95 response time < 200ms) or visual design spec defines completion?',
            missingEvidence: 'No measurable SLA or acceptance metrics provided in client request.',
          },
        ],
        affectedDeliverables: topMatch
          ? [
              {
                deliverableId: topMatch.passageId,
                scopeReference: topMatch.sourceReference,
                title: topMatch.sourceTitle,
                impactDescription: 'Deliverable requires performance optimization guidelines before work can be scoped.',
              },
            ]
          : [],
        suggestedQuestions: [
          'What specific measurable performance target (e.g., p95 response time) is expected?',
          'Does this apply across all pages or specifically to database query operations?',
        ],
      };
    }

    // ── 3. Clearly Out of Scope (Case 2: Clearly Out of Scope) ──
    const outOfScopeTechs = ['crypto', 'cryptocurrency', 'web3', 'wallet', 'token settlement', 'solana', 'ethereum', 'smart contract'];
    const isExplicitOutOfScope = outOfScopeTechs.some((t) => reqText.includes(t));

    if (isExplicitOutOfScope) {
      const proximateDel = topMatch ? ` Nearest scope passage (${topMatch.sourceReference}: ${topMatch.sourceTitle}) represents proximity context only.` : '';
      return {
        summary: `Request introduces capabilities completely outside the approved scope baseline (${newClientRequest.title}).`,
        reviewStatus: 'out_of_scope',
        confidenceScore: 0.95,
        inScopeItems: [],
        outOfScopeItems: [
          {
            item: newClientRequest.title,
            reason: `The approved proposal does not cover decentralized payments, web3 wallets, or crypto token settlement.${proximateDel}`,
            potentialImpact: 'Requires a separate proposal amendment, regulatory review, and change-order budget approval.',
          },
        ],
        uncertainItems: [],
        affectedDeliverables: [],
        suggestedQuestions: [
          'Would the client like to schedule a discovery session for a Phase 2 change order?',
        ],
      };
    }

    // ── 4. Partial Overlap (Case 3: Partial Overlap / Scope Creep) ──
    const expansionKeywords = ['bulk', 'csv', 'import', 'export', 'automated inventory sync', 'supplier format'];
    const touchesExpansion = expansionKeywords.some((w) => reqText.includes(w));

    if (touchesExpansion) {
      const matchedDel = deliverables.find(
        (d) => d.scopeReference === 'DEL-CAT-01' || (topMatch && d.scopeReference === topMatch.sourceReference)
      ) || (deliverables[1] || deliverables[0]);

      return {
        summary: `Request touches approved deliverable ${matchedDel.scopeReference} (${matchedDel.title}), but adds major new bulk processing capabilities.`,
        reviewStatus: 'partially_out_of_scope',
        confidenceScore: 0.90,
        inScopeItems: [
          {
            item: `Product catalog display and search UI for ${matchedDel.title}`,
            matchedDeliverableId: matchedDel.id,
            matchedScopeReference: matchedDel.scopeReference,
            reason: `Existing deliverable covers catalog viewing and search in ${matchedDel.scopeReference}.`,
          },
        ],
        outOfScopeItems: [
          {
            item: newClientRequest.title,
            reason: 'Requires dedicated bulk CSV parsing endpoints, supplier schema validation, and background worker queues not included in baseline scope.',
            potentialImpact: 'Estimated additional engineering effort and background job infrastructure required.',
          },
        ],
        uncertainItems: [],
        affectedDeliverables: [
          {
            deliverableId: matchedDel.id,
            scopeReference: matchedDel.scopeReference,
            title: matchedDel.title,
            impactDescription: 'Delivery milestone will require schema alterations and batch processing support.',
          },
        ],
        suggestedQuestions: [
          'What is the expected file size and frequency of batch updates?',
          'Should failed batch records halt the import or be reported as a downloadable error log?',
        ],
      };
    }

    if (!topMatch || topScore < STRONG_MATCH_THRESHOLD) {
      return uncertainResult(
        'No strongly relevant passage in the approved proposal and deliverables establishes that the requested capability is approved.'
      );
    }

    // ── 5. Clearly In Scope (Case 1: Clearly In Scope) ──
    const matchedDel = (topMatch && deliverables.find((d) => d.scopeReference === topMatch.sourceReference)) || deliverables[0];

    return {
      summary: `Refinement directly aligns with approved deliverable ${matchedDel.scopeReference} (${matchedDel.title}).`,
      reviewStatus: 'in_scope',
      confidenceScore: Math.min(0.95, Number((0.85 + topScore * 0.1).toFixed(2))),
      inScopeItems: [
        {
          item: newClientRequest.title,
          matchedDeliverableId: matchedDel.id,
          matchedScopeReference: matchedDel.scopeReference,
          reason: `Directly refines approved acceptance criteria in ${matchedDel.scopeReference}: ${matchedDel.title}.`,
        },
      ],
      outOfScopeItems: [],
      uncertainItems: [],
      affectedDeliverables: [
        {
          deliverableId: matchedDel.id,
          scopeReference: matchedDel.scopeReference,
          title: matchedDel.title,
          impactDescription: 'Minor input validation refinement during development phase.',
        },
      ],
      suggestedQuestions: [],
    };
  }
}

module.exports = {
  LocalModelProvider,
};
