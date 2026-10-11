const {
  ChangeAnalysisInputSchema,
  ChangeAnalysisOutputSchema,
  REVIEW_STATUS,
} = require('../src/contracts/aiAnalysis.contract');
const changeAnalysisMockService = require('../src/ai/services/changeAnalysisMock.service');
const {
  sampleRequestAnalytics,
  sampleRequestInScope,
  sampleRequestAmbiguous,
} = require('../src/ai/fixtures/changeAnalysisFixtures');

describe('AI Change Analysis Contract & Mock Service', () => {
  describe('Input Contract Schema Validation', () => {
    it('should successfully validate a complete, well-formed input payload', () => {
      const parsed = ChangeAnalysisInputSchema.safeParse(sampleRequestAnalytics);
      expect(parsed.success).toBe(true);
      expect(parsed.data.projectId).toBe('proj_ecommerce_99');
      expect(parsed.data.deliverables.length).toBe(3);
    });

    it('should reject payload with missing projectId', () => {
      const invalid = { ...sampleRequestAnalytics, projectId: '' };
      const parsed = ChangeAnalysisInputSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toContain('projectId');
    });

    it('should reject payload with empty deliverables array', () => {
      const invalid = { ...sampleRequestAnalytics, deliverables: [] };
      const parsed = ChangeAnalysisInputSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toContain('deliverables');
    });

    it('should reject payload with missing client request title or description', () => {
      const invalid = {
        ...sampleRequestAnalytics,
        newClientRequest: { title: '', description: '' },
      };
      const parsed = ChangeAnalysisInputSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Output Contract Schema Validation', () => {
    it('should successfully validate a conformant analysis output object', () => {
      const sampleOutput = {
        summary: 'Identified out of scope dashboard requirements.',
        reviewStatus: REVIEW_STATUS.OUT_OF_SCOPE,
        confidenceScore: 0.88,
        inScopeItems: [],
        outOfScopeItems: [
          {
            item: 'Analytics Dashboard',
            reason: 'Not present in proposal v1.',
            potentialImpact: 'Requires 40 hours of frontend/backend dev.',
          },
        ],
        uncertainItems: [],
        affectedDeliverables: [],
        evidence: [
          {
            sourceReference: 'DEL-CAT-01',
            snippet: 'Catalog search only.',
            relevanceScore: 0.9,
          },
        ],
        recommendations: ['Create separate change request.'],
        disclaimer:
          'AI analysis is an advisory draft only. Approval or rejection of changes must be finalized by authorized project participants. Cost and schedule adjustments require explicit deterministic calculation.',
        analyzedAt: new Date().toISOString(),
      };

      const parsed = ChangeAnalysisOutputSchema.safeParse(sampleOutput);
      expect(parsed.success).toBe(true);
    });

    it('should reject confidence score out of bounds (> 1.0 or < 0.0)', () => {
      const invalidOutput = {
        summary: 'Test',
        reviewStatus: REVIEW_STATUS.IN_SCOPE,
        confidenceScore: 1.5,
        inScopeItems: [],
        outOfScopeItems: [],
        uncertainItems: [],
        affectedDeliverables: [],
        evidence: [],
        recommendations: [],
        disclaimer: 'Draft only.',
      };

      const parsed = ChangeAnalysisOutputSchema.safeParse(invalidOutput);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toContain('confidenceScore');
    });

    it('should reject invalid reviewStatus enum value', () => {
      const invalidOutput = {
        summary: 'Test',
        reviewStatus: 'completely_random_status',
        confidenceScore: 0.5,
        inScopeItems: [],
        outOfScopeItems: [],
        uncertainItems: [],
        affectedDeliverables: [],
        evidence: [],
        recommendations: [],
        disclaimer: 'Draft only.',
      };

      const parsed = ChangeAnalysisOutputSchema.safeParse(invalidOutput);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toContain('reviewStatus');
    });
  });

  describe('Deterministic Mock Analysis Engine', () => {
    it('should classify analytics dashboard as partially out of scope with detected extra capabilities', () => {
      const result = changeAnalysisMockService.analyze(sampleRequestAnalytics);

      expect(result).toBeDefined();
      expect([REVIEW_STATUS.OUT_OF_SCOPE, REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE]).toContain(result.reviewStatus);
      expect(result.confidenceScore).toBeGreaterThan(0.7);
      expect(result.outOfScopeItems.length).toBeGreaterThan(0);

      // Verify that out-of-scope features were captured
      const outOfScopeNames = result.outOfScopeItems.map((i) => i.item.toLowerCase());
      expect(outOfScopeNames.some((name) => name.includes('analytics') || name.includes('dashboard'))).toBe(true);

      // Verify mandatory safety disclaimer
      expect(result.disclaimer).toContain('advisory draft only');
      expect(result.disclaimer).toContain('Approval or rejection of changes must be finalized by authorized project participants');
    });

    it('should handle ambiguous client requests by generating explicit uncertain items and questions', () => {
      const result = changeAnalysisMockService.analyze(sampleRequestAmbiguous);

      expect(result).toBeDefined();
      expect([REVIEW_STATUS.NEEDS_CLARIFICATION, REVIEW_STATUS.UNCERTAIN]).toContain(result.reviewStatus);
      expect(result.uncertainItems.length).toBeGreaterThan(0);
      expect(result.uncertainItems[0].question).toBeDefined();
      expect(result.uncertainItems[0].missingEvidence).toBeDefined();
      expect(result.recommendations.some((r) => r.toLowerCase().includes('clarification'))).toBe(true);
    });

    it('should correctly match in-scope requests referencing existing deliverables', () => {
      const result = changeAnalysisMockService.analyze(sampleRequestInScope);

      expect(result).toBeDefined();
      expect(result.reviewStatus).toBe(REVIEW_STATUS.IN_SCOPE);
      expect(result.inScopeItems.length).toBeGreaterThan(0);
      expect(result.inScopeItems[0].matchedScopeReference).toBe('DEL-CHK-01');
      expect(result.affectedDeliverables.some((d) => d.scopeReference === 'DEL-CHK-01')).toBe(true);
    });
  });
});
