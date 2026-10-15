const request = require('supertest');
const app = require('../src/app');
const {
  case1_clearlyInScope,
  case2_clearlyOutOfScope,
  case3_partialOverlap,
  case4_ambiguousRequest,
  case5_insufficientEvidence,
} = require('../src/ai/fixtures/changeAnalysisFixtures');

describe('AI Mock Endpoints (/api/ai/*)', () => {
  describe('GET /api/ai/cases', () => {
    it('should return all 5 canonical test case summaries', async () => {
      const res = await request(app).get('/api/ai/cases');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCases).toBe(5);
      expect(res.body.data.cases.length).toBe(5);

      const keys = res.body.data.cases.map((c) => c.key);
      expect(keys).toEqual([
        'clearly_in_scope',
        'clearly_out_of_scope',
        'partial_overlap',
        'ambiguous_request',
        'insufficient_evidence',
      ]);
    });
  });

  describe('GET /api/ai/cases/:caseId', () => {
    it('should retrieve single case payload by ID', async () => {
      const res = await request(app).get('/api/ai/cases/case-1');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('case-1');
      expect(res.body.data.category).toBe('Clearly In Scope');
      expect(res.body.data.payload).toBeDefined();
    });

    it('should return 404 for non-existent case ID', async () => {
      const res = await request(app).get('/api/ai/cases/unknown-case-id');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('POST /api/ai/cases/:caseId/run', () => {
    it('should execute case 1 and return in_scope classification', async () => {
      const res = await request(app).post('/api/ai/cases/case-1/run');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actualStatus).toBe('in_scope');
      expect(res.body.data.analysis.inScopeItems.length).toBeGreaterThan(0);
      expect(res.body.data.analysis.outOfScopeItems.length).toBe(0);
      expect(res.body.data.analysis.disclaimer).toBeDefined();
    });

    it('should execute case 3 and return partially_out_of_scope classification', async () => {
      const res = await request(app).post('/api/ai/cases/case-3/run');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actualStatus).toBe('partially_out_of_scope');
      expect(res.body.data.analysis.inScopeItems.length).toBeGreaterThan(0);
      expect(res.body.data.analysis.outOfScopeItems.length).toBeGreaterThan(0);
    });

    it('should execute case 5 and return uncertain classification with missing evidence', async () => {
      const res = await request(app).post('/api/ai/cases/case-5/run');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actualStatus).toBe('uncertain');
      expect(res.body.data.analysis.uncertainItems.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/ai/cases/run-all', () => {
    it('should execute all 5 cases and return allPassed = true', async () => {
      const res = await request(app).get('/api/ai/cases/run-all');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allPassed).toBe(true);
      expect(res.body.data.totalExecuted).toBe(5);
    });
  });

  describe('POST /api/ai/analyze-mock', () => {
    it('should accept valid custom payload and return validated structured analysis', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(case1_clearlyInScope);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('in_scope');
      expect(res.body.data.confidenceScore).toBeGreaterThanOrEqual(0.9);
      expect(res.body.data.disclaimer).toBeDefined();
    });

    it('should reject invalid payload with 400 Bad Request and validation errors', async () => {
      const invalidPayload = {
        projectId: '', // Invalid empty string
        approvedProposalVersion: { title: 'Test' },
        deliverables: [], // Invalid empty array
        newClientRequest: { title: '' },
      };

      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(invalidPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });
});
