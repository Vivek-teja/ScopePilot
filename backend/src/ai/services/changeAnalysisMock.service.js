const {
  ChangeAnalysisInputSchema,
  ChangeAnalysisOutputSchema,
  REVIEW_STATUS,
} = require('../../contracts/aiAnalysis.contract');

class ChangeAnalysisMockService {
  /**
   * Analyze client request against approved scope using a deterministic rule-based heuristic.
   * Ensures 100% adherence to the agreed Zod contract before LLM integration.
   *
   * @param {object} rawInput - Input matching ChangeAnalysisInputSchema
   * @returns {object} Output matching ChangeAnalysisOutputSchema
   */
  analyze(rawInput) {
    // 1. Validate Input Contract
    const validatedInput = ChangeAnalysisInputSchema.parse(rawInput);
    const { deliverables, newClientRequest } = validatedInput;

    const requestText = `${newClientRequest.title} ${newClientRequest.description}`.toLowerCase();

    const inScopeMatches = [];
    const affectedDeliverables = [];
    const evidenceList = [];
    const outOfScopeItems = [];
    const uncertainItems = [];

    // 2. Deterministic Matching against Deliverables
    const stopWords = new Set(['user', 'flow', 'test', 'item', 'page', 'make', 'view']);
    for (const deliverable of deliverables) {
      const deliverableWords = deliverable.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));
      const isMatched = deliverableWords.some((word) => requestText.includes(word));

      if (isMatched) {
        inScopeMatches.push({
          item: deliverable.title,
          matchedDeliverableId: deliverable.id,
          matchedScopeReference: deliverable.scopeReference,
          reason: `Request references terminology covered under deliverable "${deliverable.title}".`,
        });

        affectedDeliverables.push({
          deliverableId: deliverable.id,
          scopeReference: deliverable.scopeReference,
          title: deliverable.title,
          impactDescription: `May require regression testing or configuration updates alongside deliverable "${deliverable.title}".`,
        });

        evidenceList.push({
          sourceReference: deliverable.scopeReference,
          snippet: deliverable.description || deliverable.title,
          relevanceScore: 0.85,
        });
      }
    }

    // 3. Detect Out-of-Scope Concepts (e.g., dashboard, export, analytics, payment gateway, third-party)
    const outOfScopeKeywords = [
      { keyword: 'analytics', label: 'Analytics & Reporting Module' },
      { keyword: 'dashboard', label: 'Custom Metrics Dashboard' },
      { keyword: 'export', label: 'Data Export / PDF Generation' },
      { keyword: 'ai', label: 'AI/ML Recommendations' },
      { keyword: 'webhook', label: 'Third-party Webhook Integration' },
      { keyword: 'notification', label: 'SMS / Push Notification Engine' },
    ];

    for (const { keyword, label } of outOfScopeKeywords) {
      if (requestText.includes(keyword)) {
        const alreadyCovered = deliverables.some(
          (d) => d.title.toLowerCase().includes(keyword) || (d.description && d.description.toLowerCase().includes(keyword))
        );

        if (!alreadyCovered) {
          outOfScopeItems.push({
            item: label,
            reason: `Requested capability "${keyword}" was not specified in approved proposal scope or deliverables.`,
            potentialImpact: 'Requires additional backend schema, API endpoints, and UI components.',
          });
        }
      }
    }

    // 4. Detect Ambiguity / Missing Information
    const ambiguityIndicators = ['better', 'faster', 'improve', 'enhance', 'redesign', 'etc', 'optimize'];
    const hasAmbiguity = ambiguityIndicators.some((w) => requestText.includes(w));

    if (hasAmbiguity || (inScopeMatches.length === 0 && outOfScopeItems.length === 0)) {
      uncertainItems.push({
        item: newClientRequest.title,
        question: 'Could you specify the exact functional criteria, target users, and data requirements for this request?',
        missingEvidence: 'The approved proposal does not define quantitative thresholds or functional specifications for this request.',
      });
    }

    // 5. Determine Overall Classification & Confidence
    let reviewStatus = REVIEW_STATUS.UNCERTAIN;
    let confidenceScore = 0.5;

    if (uncertainItems.length > 0 && inScopeMatches.length === 0 && outOfScopeItems.length === 0) {
      reviewStatus = REVIEW_STATUS.NEEDS_CLARIFICATION;
      confidenceScore = 0.6;
    } else if (outOfScopeItems.length > 0 && inScopeMatches.length > 0) {
      reviewStatus = REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE;
      confidenceScore = 0.85;
    } else if (outOfScopeItems.length > 0 && inScopeMatches.length === 0) {
      reviewStatus = REVIEW_STATUS.OUT_OF_SCOPE;
      confidenceScore = 0.9;
    } else if (inScopeMatches.length > 0 && outOfScopeItems.length === 0 && uncertainItems.length === 0) {
      reviewStatus = REVIEW_STATUS.IN_SCOPE;
      confidenceScore = 0.92;
    }

    // If no out-of-scope items were explicitly detected and none matched, default to out-of-scope for safety
    if (outOfScopeItems.length === 0 && inScopeMatches.length === 0 && uncertainItems.length === 0) {
      outOfScopeItems.push({
        item: newClientRequest.title,
        reason: 'No matching scope references found in approved proposal version.',
        potentialImpact: 'Unbudgeted development scope.',
      });
      reviewStatus = REVIEW_STATUS.OUT_OF_SCOPE;
      confidenceScore = 0.8;
    }

    const summary =
      reviewStatus === REVIEW_STATUS.IN_SCOPE
        ? `The requested change is fully aligned with existing deliverables in the approved proposal.`
        : reviewStatus === REVIEW_STATUS.OUT_OF_SCOPE
        ? `The requested change introduces new features outside the approved proposal scope.`
        : reviewStatus === REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE
        ? `The request touches existing deliverables but adds new capabilities outside the original baseline.`
        : `The request requires further clarification from the client before scope divergence can be confirmed.`;

    const recommendations = [];
    if (reviewStatus === REVIEW_STATUS.OUT_OF_SCOPE || reviewStatus === REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE) {
      recommendations.push('Freelancer should draft an effort estimate and price adjustment for out-of-scope items.');
      recommendations.push('Client must formally approve the change request before work begins.');
    } else if (reviewStatus === REVIEW_STATUS.NEEDS_CLARIFICATION || reviewStatus === REVIEW_STATUS.UNCERTAIN) {
      recommendations.push('Request specific acceptance criteria and clarification from the client to eliminate ambiguity.');
    } else {
      recommendations.push('Confirm that the task can be completed within existing milestone hours.');
    }

    const output = {
      summary,
      reviewStatus,
      confidenceScore,
      inScopeItems: inScopeMatches,
      outOfScopeItems,
      uncertainItems,
      affectedDeliverables,
      evidence: evidenceList,
      recommendations,
      disclaimer:
        'AI analysis is an advisory draft only. Approval or rejection of changes must be finalized by authorized project participants. Cost and schedule adjustments require explicit deterministic calculation.',
      analyzedAt: new Date().toISOString(),
    };

    // 6. Validate Output Contract
    return ChangeAnalysisOutputSchema.parse(output);
  }
}

module.exports = new ChangeAnalysisMockService();
