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
   * Accurately supports the 5 required canonical review cases:
   * 1. clearly_in_scope (in_scope)
   * 2. clearly_out_of_scope (out_of_scope)
   * 3. partial_overlap (partially_out_of_scope)
   * 4. ambiguous_request (needs_clarification)
   * 5. insufficient_evidence (uncertain)
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

    // 2. Detect Unknown External / Missing Evidence Systems (Case 5: Insufficient Evidence)
    const externalUnknownSystems = [
      { keyword: 'sap', label: 'On-premise SAP ERP Integration' },
      { keyword: 'erp', label: 'Enterprise Resource Planning (ERP) Sync' },
      { keyword: 'proprietary', label: 'Proprietary Internal Connector' },
      { keyword: 'vpn', label: 'Custom VPN / Network Tunnel' },
      { keyword: 'legacy connector', label: 'Legacy Internal Connector API' },
      { keyword: 'warehouse system', label: 'On-Premise Warehouse Management System' },
    ];

    const detectedExternalSystems = externalUnknownSystems.filter(({ keyword }) =>
      requestText.includes(keyword)
    );

    const isMissingEvidenceCase = detectedExternalSystems.length > 0;

    if (isMissingEvidenceCase) {
      for (const { label, keyword } of detectedExternalSystems) {
        uncertainItems.push({
          item: label,
          question: `Can the client provide technical specifications, API schemas, sandbox credentials, and network requirements for the ${keyword} integration?`,
          missingEvidence: `The approved proposal scope and deliverables contain zero architecture documentation or interface specifications for "${keyword}".`,
        });
      }
    }

    // 3. Detect Ambiguity / Subjective Terminology (Case 4: Ambiguous Request)
    const ambiguityIndicators = [
      { word: 'faster', label: 'Latency / Speed Optimization' },
      { word: 'significantly faster', label: 'Subjective Speed Increase' },
      { word: 'enhance', label: 'Unspecified Enhancements' },
      { word: 'premium', label: 'Subjective "Premium" Styling' },
      { word: 'look and feel', label: 'Subjective Aesthetic Revision' },
      { word: 'optimize', label: 'Unquantified Optimization' },
      { word: 'better', label: 'Subjective Quality Improvement' },
      { word: 'smoother', label: 'Unspecified Performance Tuning' },
    ];

    const detectedAmbiguities = ambiguityIndicators.filter(({ word }) => requestText.includes(word));
    const isAmbiguousCase = detectedAmbiguities.length > 0 && !isMissingEvidenceCase;

    if (isAmbiguousCase) {
      uncertainItems.push({
        item: newClientRequest.title,
        question:
          'What specific measurable acceptance criteria (e.g., target page load time < 1.5s, Core Web Vitals, or Figma design mockups) define this request?',
        missingEvidence:
          'The approved proposal specifies functional deliverables but contains no contractual latency thresholds or subjective styling guidelines.',
      });
    }

    // 4. Deterministic Deliverable Matching (Checks In-Scope Overlap)
    const stopWords = new Set([
      'user',
      'flow',
      'test',
      'item',
      'page',
      'make',
      'view',
      'with',
      'from',
      'also',
      'payment',
      'system',
      'data',
      'order',
      'orders',
      'store',
    ]);
    for (const deliverable of deliverables) {
      const deliverableWords = deliverable.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      // Match deliverable words in request, avoiding false positives on pure ambiguous/missing evidence cases
      const isMatched = deliverableWords.some((word) => requestText.includes(word));

      if (isMatched && !isAmbiguousCase && !isMissingEvidenceCase) {
        inScopeMatches.push({
          item: deliverable.title,
          matchedDeliverableId: deliverable.id,
          matchedScopeReference: deliverable.scopeReference,
          reason: `Request references functionality covered under approved deliverable "${deliverable.title}".`,
        });

        affectedDeliverables.push({
          deliverableId: deliverable.id,
          scopeReference: deliverable.scopeReference,
          title: deliverable.title,
          impactDescription: `May require code refinement, schema adjustments, or regression testing alongside "${deliverable.title}".`,
        });

        evidenceList.push({
          sourceReference: deliverable.scopeReference,
          snippet: deliverable.description || deliverable.title,
          relevanceScore: 0.88,
        });
      }
    }

    // 5. Detect Out-of-Scope Capabilities
    const outOfScopeKeywords = [
      // Web3 / Crypto (Case 2)
      { keyword: 'crypto', label: 'Cryptocurrency Wallet Integration', impact: 'Requires Web3 libraries, RPC node providers, and security smart contract audit.' },
      { keyword: 'cryptocurrency', label: 'Cryptocurrency Payment Processing', impact: 'Requires crypto gateway integration and regulatory compliance checks.' },
      { keyword: 'wallet', label: 'Crypto Wallet Provider Connection', impact: 'Requires wallet connection SDKs (e.g. wagmi/web3modal).' },
      { keyword: 'metamask', label: 'MetaMask Provider Gateway', impact: 'Requires Web3 provider handling and transaction state management.' },
      { keyword: 'phantom', label: 'Solana Phantom Wallet Integration', impact: 'Requires Solana SPL token integration and RPC client.' },
      { keyword: 'smart contract', label: 'Blockchain Smart Contract Payments', impact: 'Requires Solidity/Rust smart contracts and deployment pipelines.' },
      { keyword: 'ethereum', label: 'Ethereum Network Settlement', impact: 'Requires gas fee estimation and blockchain event listeners.' },
      { keyword: 'solana', label: 'Solana Network Settlement', impact: 'Requires Solana transaction signing.' },

      // Bulk & Sync additions (Case 3)
      { keyword: 'csv', label: 'CSV Bulk Ingestion Engine', impact: 'Requires streaming CSV parser, validation pipeline, and batch database inserts.' },
      { keyword: 'bulk', label: 'Bulk Data Processing Pipeline', impact: 'Requires worker queue and background job execution infrastructure.' },
      { keyword: 'sync', label: 'Automated Supplier Inventory Sync', impact: 'Requires background cron job, external supplier API adapter, and error retry queue.' },
      { keyword: 'supplier', label: 'Third-Party Supplier Integration', impact: 'Requires external API integration and credential vault storage.' },

      // Analytics & Dashboard additions
      { keyword: 'analytics', label: 'Analytics & Reporting Module', impact: 'Requires aggregation pipelines, analytics data store, and metrics computation.' },
      { keyword: 'dashboard', label: 'Custom Metrics Dashboard UI', impact: 'Requires chart visualization components, filter controls, and analytics endpoints.' },
      { keyword: 'export', label: 'Data Export / PDF Generation', impact: 'Requires server-side PDF rendering engine and secure temporary file storage.' },
      { keyword: 'ai', label: 'AI/ML Recommendations', impact: 'Requires model hosting, vector database, and prompt engineering pipeline.' },
      { keyword: 'webhook', label: 'Third-Party Webhook Engine', impact: 'Requires webhook dispatch queue, HMAC signature verification, and retry backoff.' },
      { keyword: 'notification', label: 'SMS / Push Notification Engine', impact: 'Requires Twilio/Firebase integration, template storage, and subscriber manager.' },
    ];

    for (const { keyword, label, impact } of outOfScopeKeywords) {
      if (requestText.includes(keyword)) {
        const alreadyCovered = deliverables.some(
          (d) => d.title.toLowerCase().includes(keyword) || (d.description && d.description.toLowerCase().includes(keyword))
        );

        if (!alreadyCovered) {
          outOfScopeItems.push({
            item: label,
            reason: `Requested capability "${keyword}" was not included in approved proposal scope or deliverables.`,
            potentialImpact: impact,
          });
        }
      }
    }

    // 6. Classification & Confidence Scoring
    let reviewStatus = REVIEW_STATUS.UNCERTAIN;
    let confidenceScore = 0.5;

    if (isMissingEvidenceCase) {
      // Case 5: Insufficient Evidence -> explicitly declared uncertainty with lower confidence
      reviewStatus = REVIEW_STATUS.UNCERTAIN;
      confidenceScore = 0.45;
    } else if (isAmbiguousCase) {
      // Case 4: Ambiguous Request -> needs clarification
      reviewStatus = REVIEW_STATUS.NEEDS_CLARIFICATION;
      confidenceScore = 0.6;
    } else if (inScopeMatches.length > 0 && outOfScopeItems.length > 0) {
      // Case 3: Partial Overlap -> both in-scope and additions exist
      reviewStatus = REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE;
      confidenceScore = 0.88;
    } else if (outOfScopeItems.length > 0 && inScopeMatches.length === 0) {
      // Case 2: Clearly Out of Scope -> purely unbudgeted additions
      reviewStatus = REVIEW_STATUS.OUT_OF_SCOPE;
      confidenceScore = 0.92;
    } else if (inScopeMatches.length > 0 && outOfScopeItems.length === 0 && uncertainItems.length === 0) {
      // Case 1: Clearly In Scope -> directly matches existing deliverables
      reviewStatus = REVIEW_STATUS.IN_SCOPE;
      confidenceScore = 0.95;
    } else {
      // Fallback safeguard
      outOfScopeItems.push({
        item: newClientRequest.title,
        reason: 'No matching scope references found in approved proposal version.',
        potentialImpact: 'Unbudgeted development scope.',
      });
      reviewStatus = REVIEW_STATUS.OUT_OF_SCOPE;
      confidenceScore = 0.8;
    }

    // 7. Structured Summaries & Actionable Recommendations
    let summary = '';
    const recommendations = [];

    switch (reviewStatus) {
      case REVIEW_STATUS.IN_SCOPE:
        summary = `The requested change is fully aligned with existing deliverables in the approved proposal baseline.`;
        recommendations.push('Implement phone formatting refinement within the current checkout flow milestone allocation.');
        recommendations.push('Verify regression tests on existing Stripe checkout integration pass.');
        break;

      case REVIEW_STATUS.OUT_OF_SCOPE:
        summary = `The requested change introduces new capabilities that are entirely outside the approved proposal scope.`;
        recommendations.push('Freelancer must formulate a formal change request with explicit effort estimate and price adjustment.');
        recommendations.push('Client must formally review and accept the change request before architectural work begins.');
        break;

      case REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE:
        summary = `The request touches approved deliverables (${affectedDeliverables.map((d) => d.title).join(', ')}) but introduces substantial new out-of-scope features.`;
        recommendations.push('Isolate out-of-scope capabilities into a new milestone or standalone change request.');
        recommendations.push('Freelancer should compute schedule impact on existing catalog deliverables.');
        recommendations.push('Client approval required before adding bulk ingestion pipelines.');
        break;

      case REVIEW_STATUS.NEEDS_CLARIFICATION:
        summary = `The request contains ambiguous or subjective language without measurable acceptance criteria.`;
        recommendations.push('Request quantitative acceptance criteria and clarification (e.g. latency metrics, target devices, Figma designs) from the client.');
        recommendations.push('Do not commit to effort hours until ambiguous requirements are clarified.');
        break;

      case REVIEW_STATUS.UNCERTAIN:
      default:
        summary = `Insufficient evidence in the approved proposal to determine feasibility or baseline alignment for requested external integrations.`;
        recommendations.push('Request architectural specifications, API documentation, and security protocols from client engineering.');
        recommendations.push('Schedule a technical discovery session before providing any cost or timeline estimates.');
        recommendations.push('Do not assume compatibility with on-premise systems without verified API documentation.');
        break;
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

    // 8. Validate Output Contract
    return ChangeAnalysisOutputSchema.parse(output);
  }
}

module.exports = new ChangeAnalysisMockService();
