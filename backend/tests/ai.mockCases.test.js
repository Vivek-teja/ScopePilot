const {
  ChangeAnalysisInputSchema,
  ChangeAnalysisOutputSchema,
  REVIEW_STATUS,
} = require('../src/contracts/aiAnalysis.contract');
const changeAnalysisMockService = require('../src/ai/services/changeAnalysisMock.service');
const {
  case1_clearlyInScope,
  case2_clearlyOutOfScope,
  case3_partialOverlap,
  case4_ambiguousRequest,
  case5_insufficientEvidence,
  ALL_CASES,
} = require('../src/ai/fixtures/changeAnalysisFixtures');

describe('Review 2: Deterministic Mock Analysis Engine (5 Canonical Cases)', () => {
  describe('Case 1: Clearly In Scope (case1_clearlyInScope)', () => {
    it('should classify checkout phone validation as in_scope with high confidence', () => {
      const input = ChangeAnalysisInputSchema.parse(case1_clearlyInScope);
      const result = changeAnalysisMockService.analyze(input);

      // Verify schema compliance
      expect(ChangeAnalysisOutputSchema.safeParse(result).success).toBe(true);

      // Contract assertions
      expect(result.reviewStatus).toBe(REVIEW_STATUS.IN_SCOPE);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
      expect(result.inScopeItems.length).toBeGreaterThan(0);
      expect(result.inScopeItems[0].matchedScopeReference).toBe('DEL-CHK-01');
      expect(result.outOfScopeItems.length).toBe(0);
      expect(result.uncertainItems.length).toBe(0);
      expect(result.affectedDeliverables.some((d) => d.scopeReference === 'DEL-CHK-01')).toBe(true);
      expect(result.summary).toContain('fully aligned with existing deliverables');
    });
  });

  describe('Case 2: Clearly Out of Scope (case2_clearlyOutOfScope)', () => {
    it('should classify crypto wallet integration as out_of_scope with no in-scope matches', () => {
      const input = ChangeAnalysisInputSchema.parse(case2_clearlyOutOfScope);
      const result = changeAnalysisMockService.analyze(input);

      expect(ChangeAnalysisOutputSchema.safeParse(result).success).toBe(true);
      expect(result.reviewStatus).toBe(REVIEW_STATUS.OUT_OF_SCOPE);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
      expect(result.inScopeItems.length).toBe(0);
      expect(result.outOfScopeItems.length).toBeGreaterThan(0);
      expect(result.uncertainItems.length).toBe(0);

      const items = result.outOfScopeItems.map((i) => i.item.toLowerCase());
      expect(items.some((i) => i.includes('crypto') || i.includes('wallet'))).toBe(true);
      expect(result.summary).toContain('entirely outside the approved proposal scope');
    });
  });

  describe('Case 3: Partial Overlap (case3_partialOverlap)', () => {
    it('should classify catalog bulk CSV & supplier sync as partially_out_of_scope', () => {
      const input = ChangeAnalysisInputSchema.parse(case3_partialOverlap);
      const result = changeAnalysisMockService.analyze(input);

      expect(ChangeAnalysisOutputSchema.safeParse(result).success).toBe(true);
      expect(result.reviewStatus).toBe(REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE);
      expect(result.confidenceScore).toBeGreaterThan(0.8);

      // Must have both in-scope overlap and out-of-scope additions
      expect(result.inScopeItems.length).toBeGreaterThan(0);
      expect(result.inScopeItems[0].matchedScopeReference).toBe('DEL-CAT-01');
      expect(result.outOfScopeItems.length).toBeGreaterThan(0);
      expect(result.affectedDeliverables.some((d) => d.scopeReference === 'DEL-CAT-01')).toBe(true);

      const outOfScopeNames = result.outOfScopeItems.map((i) => i.item.toLowerCase());
      expect(outOfScopeNames.some((n) => n.includes('csv') || n.includes('sync'))).toBe(true);
    });
  });

  describe('Case 4: Ambiguous Request (case4_ambiguousRequest)', () => {
    it('should classify subjective speed/styling request as needs_clarification without forced certainty', () => {
      const input = ChangeAnalysisInputSchema.parse(case4_ambiguousRequest);
      const result = changeAnalysisMockService.analyze(input);

      expect(ChangeAnalysisOutputSchema.safeParse(result).success).toBe(true);
      expect(result.reviewStatus).toBe(REVIEW_STATUS.NEEDS_CLARIFICATION);

      // Does not force high certainty on ambiguous inputs
      expect(result.confidenceScore).toBeLessThanOrEqual(0.7);
      expect(result.uncertainItems.length).toBeGreaterThan(0);
      expect(result.uncertainItems[0].question).toContain('acceptance criteria');
      expect(result.recommendations.some((r) => r.toLowerCase().includes('clarification'))).toBe(true);
    });
  });

  describe('Case 5: Insufficient Evidence (case5_insufficientEvidence)', () => {
    it('should classify proprietary on-premise ERP sync as uncertain with explicit missing evidence', () => {
      const input = ChangeAnalysisInputSchema.parse(case5_insufficientEvidence);
      const result = changeAnalysisMockService.analyze(input);

      expect(ChangeAnalysisOutputSchema.safeParse(result).success).toBe(true);
      expect(result.reviewStatus).toBe(REVIEW_STATUS.UNCERTAIN);

      // Preserves explicit uncertainty with low confidence score
      expect(result.confidenceScore).toBeLessThanOrEqual(0.5);
      expect(result.uncertainItems.length).toBeGreaterThan(0);
      expect(result.uncertainItems[0].missingEvidence).toContain('zero architecture documentation');
      expect(result.evidence.length).toBe(0);
      expect(result.recommendations.some((r) => r.toLowerCase().includes('discovery'))).toBe(true);
    });
  });

  describe('Determinism & Reproducibility Across All 5 Cases', () => {
    it('should produce identical results over consecutive executions for all 5 cases', () => {
      for (const item of ALL_CASES) {
        const run1 = changeAnalysisMockService.analyze(item.payload);
        const run2 = changeAnalysisMockService.analyze(item.payload);

        expect(run1.reviewStatus).toBe(item.expectedStatus);
        expect(run2.reviewStatus).toBe(item.expectedStatus);
        expect(run1.confidenceScore).toBe(run2.confidenceScore);
        expect(run1.inScopeItems.length).toBe(run2.inScopeItems.length);
        expect(run1.outOfScopeItems.length).toBe(run2.outOfScopeItems.length);
        expect(run1.uncertainItems.length).toBe(run2.uncertainItems.length);
      }
    });

    it('should include mandatory advisory safety disclaimer in every case output', () => {
      for (const item of ALL_CASES) {
        const result = changeAnalysisMockService.analyze(item.payload);
        expect(result.disclaimer).toContain('advisory draft only');
        expect(result.disclaimer).toContain('Approval or rejection of changes must be finalized by authorized project participants');
      }
    });
  });
});
