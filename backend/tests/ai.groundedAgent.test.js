const request = require('supertest');
const app = require('../src/app');
const { defaultGroundedAgentService, GroundedAgentService } = require('../src/ai/agent/groundedAgent.service');
const { defaultEffortCalculator } = require('../src/ai/tools/effortCalculator.tool');
const { defaultProviderFactory } = require('../src/ai/providers/providerFactory');
const { ALL_CASES } = require('../src/ai/fixtures/changeAnalysisFixtures');
const { GroundedAgentOutputSchema } = require('../src/contracts/agentAnalysis.contract');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');

describe('AI Reviews 4 & 5: Grounded Agent, Multi-Provider & Handover Pipeline', () => {
  // ── 1. Effort Calculator Tool Tests ─────────────────────────────────────────
  describe('EffortCalculatorTool', () => {
    it('should calculate 0 hours and $0 cost for in_scope review status', () => {
      const result = defaultEffortCalculator.calculate({
        reviewStatus: 'in_scope',
        storedHourlyRate: 120,
      });

      expect(result.estimatedHours).toBe(0);
      expect(result.estimatedCost).toBe(0);
      expect(result.scheduleImpactDays).toBe(0);
      expect(result.isEligibleForBilling).toBe(false);
      expect(result.calculationBasis).toContain('In-scope refinement');
    });

    it('should suppress numeric calculation for needs_clarification and uncertain', () => {
      const resUncertain = defaultEffortCalculator.calculate({
        reviewStatus: 'uncertain',
        storedHourlyRate: 100,
      });
      expect(resUncertain.estimatedHours).toBeNull();
      expect(resUncertain.estimatedCost).toBeNull();
      expect(resUncertain.isEligibleForBilling).toBe(false);

      const resClarify = defaultEffortCalculator.calculate({
        reviewStatus: 'needs_clarification',
        storedHourlyRate: 100,
      });
      expect(resClarify.estimatedHours).toBeNull();
      expect(resClarify.estimatedCost).toBeNull();
    });

    it('should compute formula-based effort for out_of_scope and partially_out_of_scope', () => {
      const result = defaultEffortCalculator.calculate({
        reviewStatus: 'out_of_scope',
        outOfScopeItemsCount: 1,
        complexityLevel: 'medium',
        storedHourlyRate: 100,
      });

      expect(result.estimatedHours).toBeGreaterThan(0);
      expect(result.estimatedCost).toBe(result.estimatedHours * 100);
      expect(result.scheduleImpactDays).toBe(Math.ceil(result.estimatedHours / 6));
      expect(result.isEligibleForBilling).toBe(true);
      expect(result.calculationBasis).toContain('Calculated using formula');
    });
  });

  // ── 2. Provider Factory & Fallback Tests ─────────────────────────────────────
  describe('ProviderFactory', () => {
    it('should report availability status for all 4 providers', async () => {
      const status = await defaultProviderFactory.getProvidersStatus();
      expect(status).toHaveProperty('activeProvider');
      expect(Array.isArray(status.providers)).toBe(true);
      expect(status.providers.length).toBe(4);

      const localProv = status.providers.find((p) => p.name === 'local');
      expect(localProv.isAvailable).toBe(true);
    });

    it('should safely fall back to local provider when external model is unavailable', async () => {
      // Request Ollama when local daemon is not running
      const { provider, fallbackUsed } = await defaultProviderFactory.getProvider('ollama');
      expect(provider).toBeDefined();
      if (!provider.isAvailable) {
        expect(fallbackUsed).toBe(true);
      }
    });

    it('should allow switching the active provider to a valid option', () => {
      const active = defaultProviderFactory.setActiveProvider('local');
      expect(active).toBe('local');
    });

    it('should throw an error when selecting an unsupported provider', () => {
      expect(() => defaultProviderFactory.setActiveProvider('unsupported_llm')).toThrow();
    });
  });

  // ── 3. Grounded Agent Service — 5 Canonical Cases ───────────────────────────
  describe('GroundedAgentService Canonical Evaluation', () => {
    it('Case 1: Clearly In Scope should return in_scope with 0h effort and match DEL-CHK-01', async () => {
      const output = await defaultGroundedAgentService.analyze(ALL_CASES[0].payload);

      expect(output.reviewStatus).toBe('in_scope');
      expect(output.inScopeItems.length).toBeGreaterThan(0);
      expect(output.effortCalculation.estimatedHours).toBe(0);
      expect(output.retrievedEvidence[0].sourceReference).toBe('DEL-CHK-01');

      // Validate Zod schema adherence
      expect(() => GroundedAgentOutputSchema.parse(output)).not.toThrow();
    });

    it('Case 2: Clearly Out of Scope should return out_of_scope with billed effort', async () => {
      const output = await defaultGroundedAgentService.analyze(ALL_CASES[1].payload);

      expect(output.reviewStatus).toBe('out_of_scope');
      expect(output.outOfScopeItems.length).toBeGreaterThan(0);
      expect(output.effortCalculation.estimatedCost).toBeGreaterThan(0);
      expect(output.effortCalculation.isEligibleForBilling).toBe(true);
    });

    it('Case 3: Partial Overlap should return partially_out_of_scope with in-scope and out-of-scope items', async () => {
      const output = await defaultGroundedAgentService.analyze(ALL_CASES[2].payload);

      expect(output.reviewStatus).toBe('partially_out_of_scope');
      expect(output.inScopeItems.length).toBeGreaterThan(0);
      expect(output.outOfScopeItems.length).toBeGreaterThan(0);
      expect(output.effortCalculation.estimatedHours).toBeGreaterThan(0);
    });

    it('Case 4: Ambiguous Request should return needs_clarification with questions and suppressed effort', async () => {
      const output = await defaultGroundedAgentService.analyze(ALL_CASES[3].payload);

      expect(output.reviewStatus).toBe('needs_clarification');
      expect(output.uncertainItems.length).toBeGreaterThan(0);
      expect(output.effortCalculation.estimatedHours).toBeNull();
      expect(output.suggestedQuestions.length).toBeGreaterThan(0);
    });

    it('Case 5: Insufficient Evidence should return uncertain with zero candidate hallucination', async () => {
      const output = await defaultGroundedAgentService.analyze(ALL_CASES[4].payload);

      expect(output.reviewStatus).toBe('uncertain');
      expect(output.inScopeItems.length).toBe(0);
      expect(output.uncertainItems.length).toBeGreaterThan(0);
      expect(output.effortCalculation.estimatedHours).toBeNull();
      expect(output.uncertainItems[0].missingEvidence).toContain('no documentation or architectural specifications');
    });

    it('should instantiate GroundedAgentService with custom options', () => {
      const customAgent = new GroundedAgentService();
      expect(customAgent).toBeInstanceOf(GroundedAgentService);
    });

    it('should always attach human review draft notice preserving human authority', async () => {
      const output = await defaultGroundedAgentService.analyze(ALL_CASES[0].payload);
      expect(output.humanReviewDraftNotice).toContain('ADVISORY DRAFT ONLY');
      expect(output.humanReviewDraftNotice).toContain('zero authority to approve or reject');
    });
  });

  // ── 4. REST Endpoints Integration Tests (/api/ai/agent/*) ──────────────────
  describe('REST Endpoints (/api/ai/agent/*)', () => {
    it('POST /api/ai/agent/analyze should require authentication', async () => {
      const res = await request(app)
        .post('/api/ai/agent/analyze')
        .send(ALL_CASES[0].payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/ai/agent/analyze should reject an invalid authenticated payload with 400', async () => {
      const userId = '64a000000000000000000005';
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: userId, role: 'freelancer' }),
      });

      const res = await request(app)
        .post('/api/ai/agent/analyze')
        .set('Authorization', `Bearer ${generateToken({ id: userId })}`)
        .send({ invalid: 'payload' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/ai/agent/providers should return 200 and list available model providers', async () => {
      const res = await request(app).get('/api/ai/agent/providers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers.length).toBe(4);
    });

    it('POST /api/ai/agent/providers/select should require authentication', async () => {
      const res = await request(app)
        .post('/api/ai/agent/providers/select')
        .send({ provider: 'local' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/ai/agent/benchmark should require auth (B1 fix) and run all 5 canonical cases when authenticated', async () => {
      // First verify it rejects anonymous requests
      const anonRes = await request(app).get('/api/ai/agent/benchmark');
      expect(anonRes.status).toBe(401);

      // Then verify it works with a valid token
      const userId = '64a000000000000000000001';
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: userId, role: 'freelancer' }),
      });
      const token = generateToken({ id: userId });
      const res = await request(app)
        .get('/api/ai/agent/benchmark')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allPassed).toBe(true);
      expect(res.body.data.totalExecuted).toBe(5);
    });
  });

  // ── 5. Project-Specific Dynamic Retrieval & Fallback Regression Tests ───────
  describe('Project-Specific Scope Retrieval & Fallback Guardrails', () => {
    const projectHealthcare = {
      projectId: '65f1a2b3c4d5e6f7a8b9c0d1',
      approvedProposalVersion: {
        versionNumber: 2,
        title: 'Hospital EHR Portal',
        scopeSummary: 'Patient medical records, diagnostic lab results, and HIPAA audit logging.',
        scopeItems: [
          {
            title: 'HIPAA Audit Trail',
            description: 'Immutable cryptographic logging of patient health records access.',
            estimatedHours: 40,
            price: 4800,
          },
        ],
      },
      deliverables: [
        {
          id: 'del_hipaa_01',
          title: 'HIPAA Compliance Audit Logging Engine',
          scopeReference: 'DEL-HIPAA-01',
          description: 'Cryptographic immutable logging of patient health records access with inspector verification.',
          acceptanceCriteria: ['Audit trail generated on record access', 'Tamper-evident hash chaining'],
        },
      ],
    };

    it('searches Project A passages strictly and does NOT retrieve canonical e-commerce items', async () => {
      const output = await defaultGroundedAgentService.analyze({
        ...projectHealthcare,
        newClientRequest: {
          title: 'Export HIPAA audit log to compliance PDF',
          description: 'Download cryptographically signed audit log for medical inspectors.',
        },
      });

      expect(output.retrievedEvidence.length).toBeGreaterThan(0);
      // Evidence must match Project A's HIPAA deliverable
      expect(output.retrievedEvidence[0].sourceReference).toBe('DEL-HIPAA-01');
      expect(output.retrievedEvidence[0].sourceTitle).toContain('HIPAA');

      // Canonical e-commerce items must NEVER be present
      const references = output.retrievedEvidence.map((e) => e.sourceReference);
      expect(references).not.toContain('DEL-CHK-01');
      expect(references).not.toContain('DEL-CAT-01');
      expect(references).not.toContain('DEL-PAY-01');
    });

    it('unrelated e-commerce request against Healthcare project does not match canonical store scope', async () => {
      const output = await defaultGroundedAgentService.analyze({
        ...projectHealthcare,
        newClientRequest: {
          title: 'Add shopping cart checkout with Stripe payment',
          description: 'Allow clients to purchase retail goods with multi-step cart.',
        },
      });

      // Must NOT match DEL-CHK-01 from canonical corpus
      const references = output.retrievedEvidence.map((e) => e.sourceReference);
      expect(references).not.toContain('DEL-CHK-01');
      expect(references).not.toContain('DEL-PAY-01');

      // Since project only has HIPAA audit logging, similarity is low and classification cannot be in_scope
      expect(output.reviewStatus).not.toBe('in_scope');
      expect(output.reviewStatus).toBe('uncertain');
      expect(output.effortCalculation.estimatedCost).toBeNull();
      expect(output.effortCalculation.estimatedHours).toBeNull();
    });

    it('irrelevant project deliverables cannot produce confident in_scope decision with zero cost', async () => {
      const irrelevantProject = {
        projectId: '65f1a2b3c4d5e6f7a8b9c0d2',
        approvedProposalVersion: {
          versionNumber: 1,
          title: 'Infrastructure Baseline Project',
          scopeSummary: 'Server hardware deployment and operating system installation.',
          scopeItems: [
            {
              title: 'Hardware Rack Mounting',
              description: 'Physical server installation in data center.',
              estimatedHours: 20,
              price: 2000,
            },
          ],
        },
        deliverables: [
          {
            id: 'del_infra_01',
            title: 'Server Hardware Deployment',
            scopeReference: 'DEL-INFRA-01',
            description: 'Physical server mounting and power cabling in server room.',
            acceptanceCriteria: ['Server power verified'],
          },
        ],
      };

      const output = await defaultGroundedAgentService.analyze({
        ...irrelevantProject,
        newClientRequest: {
          title: 'Add customer checkout portal with Stripe credit card processing',
          description: 'Payment gateway integration with multi-currency support.',
        },
      });

      expect(output.reviewStatus).toBe('uncertain');
      expect(output.effortCalculation.estimatedCost).toBeNull();
      expect(output.effortCalculation.estimatedHours).toBeNull();
      expect(output.effortCalculation.isEligibleForBilling).toBe(false);
    });

    it('retrieval exception does not silently fall back to unrelated canonical evidence', async () => {
      const mockRetrievalService = {
        retrieve: jest.fn().mockImplementation(() => {
          throw new Error('Vector database index connection failed');
        }),
      };

      const agent = new GroundedAgentService({
        retrievalService: mockRetrievalService,
        providerFactory: defaultGroundedAgentService.providerFactory,
        effortCalculator: defaultGroundedAgentService.effortCalculator,
      });

      const output = await agent.analyze({
        ...projectHealthcare,
        newClientRequest: {
          title: 'Export HIPAA audit log to compliance PDF',
          description: 'Generate compliance certificate.',
        },
      });

      expect(mockRetrievalService.retrieve).toHaveBeenCalled();
      // Must NOT have fallen back to canonical corpus!
      expect(output.retrievedEvidence).toHaveLength(0);
      expect(output.reviewStatus).toBe('uncertain');
      expect(output.effortCalculation.estimatedCost).toBeNull();
    });

    it('direct standalone retrieval still retrieves canonical corpus where intended', () => {
      const { defaultRetrievalService } = require('../src/ai/rag/retrieval.service');
      const res = defaultRetrievalService.retrieve({
        query: 'Checkout cart with Stripe payment',
        topK: 3,
        minThreshold: 0.35,
      });

      expect(res.retrievedPassages.length).toBeGreaterThan(0);
      const references = res.retrievedPassages.map((p) => p.sourceReference);
      expect(references.some((r) => r.startsWith('DEL-'))).toBe(true);
    });
  });
});
