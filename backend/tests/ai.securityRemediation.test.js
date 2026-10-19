const request = require('supertest');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const projectService = require('../src/modules/project/project.service');
const Deliverable = require('../src/modules/deliverable/deliverable.model');
const { ProposalVersion } = require('../src/modules/proposal/proposal.model');
const { defaultGroundedAgentService, GroundedAgentService } = require('../src/ai/agent/groundedAgent.service');
const { LocalModelProvider } = require('../src/ai/providers/localProvider');
const { SUPPORTED_PROVIDERS } = require('../src/ai/providers/providerFactory');
const { ALL_CASES } = require('../src/ai/fixtures/changeAnalysisFixtures');

const projectId = '64a000000000000000000001';
const proposalVersionId = '64a000000000000000000002';
const deliverableId = '64a000000000000000000003';
const userId = '64a000000000000000000004';
const token = generateToken({ id: userId });
const user = { _id: userId, role: 'freelancer' };

const strongEvidence = [{
  passageId: 'passage-1',
  sourceReference: 'DEL-CHK-01',
  sourceTitle: 'Checkout',
  documentType: 'deliverable',
  proposalVersion: 1,
  similarityScore: 0.9,
  relevanceCategory: 'strong_match',
  passageText: 'Checkout processing and phone validation.',
  whyRetrieved: 'Strong match.',
  metadata: {},
}];

describe('AI security and classification remediation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockAuthenticatedUser = () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });
  };

  describe('POST /api/ai/agent/providers/select', () => {
    it('rejects unauthenticated provider changes', async () => {
      const res = await request(app)
        .post('/api/ai/agent/providers/select')
        .send({ provider: 'local' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('allows an authenticated caller to select a supported provider', async () => {
      mockAuthenticatedUser();

      const res = await request(app)
        .post('/api/ai/agent/providers/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ provider: 'local' });

      expect(res.status).toBe(200);
      expect(res.body.data.activeProvider).toBe('local');
    });

    it('rejects unsupported provider names with 400', async () => {
      mockAuthenticatedUser();

      const res = await request(app)
        .post('/api/ai/agent/providers/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ provider: 'huggingface' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(SUPPORTED_PROVIDERS).not.toContain('huggingface');
    });

    it('scopes provider selection so one user choice does not mutate settings for unrelated users', async () => {
      const userAId = '64a000000000000000000004';
      const userBId = '64a000000000000000000009';
      const tokenA = generateToken({ id: userAId });
      const tokenB = generateToken({ id: userBId });

      jest.spyOn(User, 'findById').mockImplementation((id) => {
        const idStr = id?.toString();
        const role = 'freelancer';
        return {
          select: jest.fn().mockResolvedValue({ _id: idStr, role }),
        };
      });

      // User A selects gemini
      const resA = await request(app)
        .post('/api/ai/agent/providers/select')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ provider: 'gemini' });
      expect(resA.status).toBe(200);
      expect(resA.body.data.activeProvider).toBe('gemini');

      // User B checks their active provider - must still be local (not affected by User A)
      const resB = await request(app)
        .get('/api/ai/agent/providers')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(resB.status).toBe(200);
      expect(resB.body.data.activeProvider).toBe('local');
    });
  });

  describe('Local grounded classification', () => {
    const provider = new LocalModelProvider();
    const deliverables = ALL_CASES[0].payload.deliverables;

    it.each([
      ['no passages', []],
      ['weak unrelated passage', [{ similarityScore: 0.12 }]],
    ])('returns uncertain instead of in_scope for %s', async (_description, retrievedPassages) => {
      const result = await provider.generateComparison({
        newClientRequest: {
          title: 'Build a native iOS app',
          description: 'Create an unrelated mobile application for Apple devices.',
        },
        retrievedPassages,
        deliverables,
      });

      expect(result.reviewStatus).toBe('uncertain');
      expect(result.inScopeItems).toHaveLength(0);
      expect(result.uncertainItems).toHaveLength(1);
    });

    it('preserves canonical in-scope classification with strong evidence', async () => {
      const result = await provider.generateComparison({
        newClientRequest: ALL_CASES[0].payload.newClientRequest,
        retrievedPassages: strongEvidence,
        deliverables,
      });

      expect(result.reviewStatus).toBe('in_scope');
      expect(result.inScopeItems).toHaveLength(1);
    });
  });

  describe('Grounded agent evidence and billing safeguards', () => {
    const createService = ({ retrievedPassages, comparisonResult }) => {
      const provider = {
        name: 'gemini',
        modelName: 'test-model',
        generateComparison: jest.fn().mockResolvedValue(comparisonResult),
      };
      const providerFactory = {
        localProvider: provider,
        getProvider: jest.fn().mockResolvedValue({ provider, fallbackUsed: false }),
      };
      const retrievalService = {
        retrieve: jest.fn().mockReturnValue({ retrievedPassages }),
      };

      return new GroundedAgentService({ providerFactory, retrievalService });
    };

    const inScopeComparison = {
      summary: 'Model claims the request is in scope.',
      reviewStatus: 'in_scope',
      confidenceScore: 0.95,
      inScopeItems: [{ item: 'Request', reason: 'Model assertion.' }],
      outOfScopeItems: [],
      uncertainItems: [],
      affectedDeliverables: [],
      suggestedQuestions: [],
    };

    it('overrides model in_scope classifications when evidence is empty', async () => {
      const service = createService({
        retrievedPassages: [],
        comparisonResult: inScopeComparison,
      });

      const result = await service.analyze(ALL_CASES[0].payload);

      expect(result.reviewStatus).toBe('uncertain');
      expect(result.inScopeItems).toHaveLength(0);
      expect(result.effortCalculation.estimatedCost).toBeNull();
      expect(result.effortCalculation.estimatedHours).toBeNull();
    });

    it('suppresses cost and billing eligibility when no trusted project rate exists', async () => {
      const comparisonResult = {
        ...inScopeComparison,
        reviewStatus: 'out_of_scope',
        inScopeItems: [],
        outOfScopeItems: [{ item: 'Request', reason: 'Outside scope.' }],
        affectedDeliverables: [],
      };
      const service = createService({
        retrievedPassages: strongEvidence,
        comparisonResult,
      });

      const result = await service.analyze(ALL_CASES[1].payload, { suppressBilling: true });

      expect(result.effortCalculation.estimatedHours).toBeGreaterThan(0);
      expect(result.effortCalculation.hourlyRate).toBeNull();
      expect(result.effortCalculation.estimatedCost).toBeNull();
      expect(result.effortCalculation.isEligibleForBilling).toBe(false);
      expect(result.effortCalculation.calculationBasis).toContain('no trusted stored project hourly rate');
    });
  });

  describe('POST /api/ai/agent/analyze project authorization and trusted context', () => {
    const project = {
      _id: projectId,
      currentApprovedProposal: proposalVersionId,
    };
    const approvedProposalVersion = {
      _id: proposalVersionId,
      project: projectId,
      status: 'approved',
      versionNumber: 3,
      title: 'Persisted proposal',
      scopeSummary: 'Persisted approved scope.',
      scopeItems: [{ title: 'Persisted scope item', description: 'DB value', estimatedHours: 8, price: 800 }],
    };
    const deliverables = [{
      _id: deliverableId,
      title: 'Persisted dashboard',
      scopeReference: 'DEL-DASH-01',
      description: 'Database deliverable.',
      acceptanceCriteria: ['Persisted criterion'],
    }];
    const validBody = {
      projectId,
      approvedProposalVersion: {
        versionNumber: 1,
        title: 'Attacker supplied proposal',
        scopeSummary: 'Untrusted scope.',
        scopeItems: [],
      },
      deliverables: [{
        id: 'attacker-deliverable',
        title: 'Untrusted deliverable',
        scopeReference: 'DEL-UNTRUSTED',
      }],
      newClientRequest: {
        title: 'Add a chart',
        description: 'Add one chart to the project dashboard.',
      },
      storedHourlyRate: 1,
    };

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/ai/agent/analyze')
        .send(validBody);

      expect(res.status).toBe(401);
    });

    it('rejects a user denied access to the persisted project', async () => {
      mockAuthenticatedUser();
      jest.spyOn(projectService, 'getProjectById').mockRejectedValue(
        Object.assign(new Error('You do not have access to this project'), { statusCode: 403, success: false })
      );

      const res = await request(app)
        .post('/api/ai/agent/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody);

      expect(res.status).toBe(403);
    });

    it('uses persisted approved scope and deliverables, ignoring caller snapshots and rate', async () => {
      mockAuthenticatedUser();
      jest.spyOn(projectService, 'getProjectById').mockResolvedValue(project);
      jest.spyOn(ProposalVersion, 'findOne').mockResolvedValue(approvedProposalVersion);
      jest.spyOn(Deliverable, 'find').mockResolvedValue(deliverables);
      const analyze = jest.spyOn(defaultGroundedAgentService, 'analyze').mockResolvedValue({
        reviewStatus: 'uncertain',
        effortCalculation: { estimatedCost: null },
      });

      const res = await request(app)
        .post('/api/ai/agent/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody);

      expect(res.status).toBe(200);
      expect(projectService.getProjectById).toHaveBeenCalledWith(projectId, userId);
      expect(analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          approvedProposalVersion: expect.objectContaining({
            title: 'Persisted proposal',
            scopeSummary: 'Persisted approved scope.',
          }),
          deliverables: [
            expect.objectContaining({
              id: deliverableId,
              title: 'Persisted dashboard',
              scopeReference: 'DEL-DASH-01',
            }),
          ],
          storedHourlyRate: 1,
        }),
        { suppressBilling: true }
      );
      expect(ProposalVersion.findOne).toHaveBeenCalledWith({
        _id: proposalVersionId,
        project: projectId,
        status: 'approved',
      });
      expect(Deliverable.find).toHaveBeenCalledWith({ project: projectId });
    });

    it('rejects projects without a current approved proposal', async () => {
      mockAuthenticatedUser();
      jest.spyOn(projectService, 'getProjectById').mockResolvedValue({
        ...project,
        currentApprovedProposal: null,
      });
      const findProposalVersion = jest.spyOn(ProposalVersion, 'findOne');

      const res = await request(app)
        .post('/api/ai/agent/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody);

      expect(res.status).toBe(409);
      expect(findProposalVersion).not.toHaveBeenCalled();
    });
  });

  // ── B1: Public routes must require auth when they call providers ─────────────
  describe('B1 – provider-calling routes require authentication', () => {
    it('GET /api/ai/agent/benchmark returns 401 without token', async () => {
      const res = await request(app).get('/api/ai/agent/benchmark');
      expect(res.status).toBe(401);
    });

    it('POST /api/ai/scope-chat returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/ai/scope-chat')
        .send({ message: 'test', projectId });
      expect(res.status).toBe(401);
    });

    it('POST /api/ai/change-agent returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/ai/change-agent')
        .send({ request: 'add feature', projectId });
      expect(res.status).toBe(401);
    });

    it('POST /api/ai/scope-analysis-db returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/ai/scope-analysis-db')
        .send({ projectId });
      expect(res.status).toBe(401);
    });

    it('POST /api/ai/rag/ingest returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/ai/rag/ingest')
        .send({ projectId });
      expect(res.status).toBe(401);
    });

    it('top-level POST /api/scope-chat returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/scope-chat')
        .send({ message: 'test', projectId });
      expect(res.status).toBe(401);
    });

    it('top-level POST /api/change-agent returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/change-agent')
        .send({ request: 'add feature', projectId });
      expect(res.status).toBe(401);
    });

    it('GET /api/ai/cases is still public (no provider call)', async () => {
      const res = await request(app).get('/api/ai/cases');
      expect(res.status).toBe(200);
    });

    it('GET /api/ai/rag/corpus is still public (no provider call)', async () => {
      const res = await request(app).get('/api/ai/rag/corpus');
      expect(res.status).toBe(200);
    });

    it('GET /api/ai/agent/providers is still public (no provider call, no private data)', async () => {
      const res = await request(app).get('/api/ai/agent/providers');
      expect(res.status).toBe(200);
    });
  });

  // ── B1: Rate limiter returns 429 and blocks calls before provider is reached ─
  describe('B1 – AI rate limiter', () => {
    const { createAiRateLimiter, _windows } = require('../src/ai/middleware/aiRateLimiter.middleware');

    beforeEach(() => {
      // Clear all rate-limit windows between tests
      _windows.clear();
    });

    it('returns 429 after max calls are exceeded within the window', () => {
      const limiter = createAiRateLimiter({ windowMs: 60000, max: 3 });
      const mockReq = { user: { _id: 'rate-test-user' }, ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn(),
      };
      const next = jest.fn();

      // First 3 calls should pass
      limiter(mockReq, mockRes, next);
      limiter(mockReq, mockRes, next);
      limiter(mockReq, mockRes, next);
      expect(next).toHaveBeenCalledTimes(3);

      // 4th call must be rate-limited
      limiter(mockReq, mockRes, next);
      expect(next).toHaveBeenCalledTimes(3); // unchanged
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, retryAfterSeconds: expect.any(Number) })
      );
    });

    it('sets Retry-After header on 429 response', () => {
      const limiter = createAiRateLimiter({ windowMs: 60000, max: 1 });
      const mockReq = { user: { _id: 'rate-header-user' }, ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn(),
      };
      const next = jest.fn();

      limiter(mockReq, mockRes, next); // pass
      limiter(mockReq, mockRes, next); // blocked

      const setCalls = mockRes.set.mock.calls.map(([k]) => k);
      expect(setCalls).toContain('Retry-After');
    });

    it('different users have independent windows (user A blocked does not block user B)', () => {
      const limiter = createAiRateLimiter({ windowMs: 60000, max: 1 });
      const userA = { user: { _id: 'user-a' }, ip: '127.0.0.1' };
      const userB = { user: { _id: 'user-b' }, ip: '127.0.0.2' };
      const nextA = jest.fn();
      const nextB = jest.fn();
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn() };

      limiter(userA, mockRes, nextA); // A: pass
      limiter(userA, mockRes, nextA); // A: blocked
      expect(nextA).toHaveBeenCalledTimes(1);

      limiter(userB, mockRes, nextB); // B: still pass (separate bucket)
      expect(nextB).toHaveBeenCalledTimes(1);
    });

    it('resets count after the window expires', () => {
      const limiter = createAiRateLimiter({ windowMs: 1, max: 1 }); // 1ms window
      const mockReq = { user: { _id: 'rate-reset-user' }, ip: '127.0.0.1' };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn() };
      const next = jest.fn();

      limiter(mockReq, mockRes, next); // pass
      limiter(mockReq, mockRes, next); // blocked

      // Wait for window to expire, then try again
      return new Promise((resolve) => {
        setTimeout(() => {
          limiter(mockReq, mockRes, next); // should pass again
          expect(next).toHaveBeenCalledTimes(2);
          resolve();
        }, 10);
      });
    });
  });

  // ── B2: Contradictory evidence must prevent in_scope classification ─────────
  describe('B2 – contradictory evidence guard', () => {
    it('returns needs_clarification when exclusion passage is present alongside strong match', async () => {
      const provider = new LocalModelProvider();
      jest.spyOn(provider, 'generateComparison').mockResolvedValue({
        summary: 'Request matches checkout functionality',
        reviewStatus: 'in_scope',
        confidenceScore: 0.92,
        inScopeItems: [{ item: 'Checkout redesign', matchedScopeReference: 'DEL-CHK-01', reason: 'matched checkout deliverable' }],
        outOfScopeItems: [],
        uncertainItems: [],
        affectedDeliverables: [{ deliverableId: 'DEL-CHK-01', scopeReference: 'DEL-CHK-01', title: 'Checkout', impactDescription: 'Redesign impacts checkout flow' }],
        suggestedQuestions: [],
      });

      const service = new GroundedAgentService({
        providerFactory: {
          getProvider: jest.fn().mockResolvedValue({ provider, fallbackUsed: false }),
          localProvider: provider,
        },
        retrievalService: {
          retrieve: jest.fn().mockReturnValue({
            retrievedPassages: [
              {
                passageId: 'p1',
                sourceReference: 'DEL-CHK-01',
                sourceTitle: 'Checkout',
                documentType: 'deliverable',
                proposalVersion: 1,
                similarityScore: 0.92, // strong match
                relevanceCategory: 'strong_match',
                // Key: exclusion keyword in the passage text
                passageText: 'Checkout is excluded from this phase; it will be addressed in Phase 2.',
                whyRetrieved: 'matched',
                metadata: {},
              },
            ],
          }),
        },
      });

      const result = await service.analyze({
        projectId,
        approvedProposalVersion: {
          versionNumber: 1,
          title: 'Checkout Project Proposal v1',
          scopeSummary: 'Checkout flow, payment processing and cart management.',
          scopeItems: [],
        },
        deliverables: [{
          id: 'DEL-CHK-01',
          title: 'Checkout Flow',
          description: 'Payment and cart deliverable',
          scopeReference: 'DEL-CHK-01',
          acceptanceCriteria: ['Cart works end to end'],
        }],
        newClientRequest: {
          title: 'Checkout redesign',
          description: 'Redesign the checkout flow',
          requestedBy: 'client',
        },
      });

      expect(result.reviewStatus).toBe('needs_clarification');
      expect(result.summary).toMatch(/evidence conflict/i);
    });

    it('returns uncertain when model says in_scope but top passage is below threshold', async () => {
      const provider = new LocalModelProvider();
      jest.spyOn(provider, 'generateComparison').mockResolvedValue({
        summary: 'Weak match found',
        reviewStatus: 'in_scope',
        confidenceScore: 0.25,
        inScopeItems: [{ item: 'AI chatbot', matchedScopeReference: 'DEL-01', reason: 'weak keyword match' }],
        outOfScopeItems: [],
        uncertainItems: [],
        affectedDeliverables: [],
        suggestedQuestions: [],
      });

      const service = new GroundedAgentService({
        providerFactory: {
          getProvider: jest.fn().mockResolvedValue({ provider, fallbackUsed: false }),
          localProvider: provider,
        },
        retrievalService: {
          retrieve: jest.fn().mockReturnValue({
            retrievedPassages: [
              {
                passageId: 'p2',
                sourceReference: 'DEL-01',
                sourceTitle: 'Reporting',
                documentType: 'deliverable',
                proposalVersion: 1,
                similarityScore: 0.25, // below STRONG_MATCH_THRESHOLD
                relevanceCategory: 'weak_match',
                passageText: 'Monthly CSV export reporting.',
                whyRetrieved: 'partial',
                metadata: {},
              },
            ],
          }),
        },
      });

      const result = await service.analyze({
        projectId,
        approvedProposalVersion: {
          versionNumber: 1,
          title: 'Reporting Module Proposal v1',
          scopeSummary: 'CSV reporting and data export features.',
          scopeItems: [],
        },
        deliverables: [{
          id: 'DEL-01',
          title: 'Reporting Dashboard',
          description: 'Monthly CSV export and reporting',
          scopeReference: 'DEL-01',
          acceptanceCriteria: ['Reports export in CSV format'],
        }],
        newClientRequest: {
          title: 'Build AI chatbot assistant',
          description: 'Add an AI chatbot to the app',
          requestedBy: 'client',
        },
      });

      expect(result.reviewStatus).toBe('uncertain');
      expect(result.summary).toMatch(/insufficient/i);
    });

    it('preserves in_scope when evidence is strong and no contradictory passage exists', async () => {
      const provider = new LocalModelProvider();
      jest.spyOn(provider, 'generateComparison').mockResolvedValue({
        summary: 'Clearly in scope — strong evidence found',
        reviewStatus: 'in_scope',
        confidenceScore: 0.95,
        inScopeItems: [{ item: 'Checkout', matchedScopeReference: 'DEL-CHK-01', reason: 'Exact match to checkout deliverable' }],
        outOfScopeItems: [],
        uncertainItems: [],
        affectedDeliverables: [{ deliverableId: 'DEL-CHK-01', scopeReference: 'DEL-CHK-01', title: 'Checkout', impactDescription: 'Bug fix in checkout payment validation' }],
        suggestedQuestions: [],
      });

      const service = new GroundedAgentService({
        providerFactory: {
          getProvider: jest.fn().mockResolvedValue({ provider, fallbackUsed: false }),
          localProvider: provider,
        },
        retrievalService: {
          retrieve: jest.fn().mockReturnValue({
            retrievedPassages: [
              {
                passageId: 'p3',
                sourceReference: 'DEL-CHK-01',
                sourceTitle: 'Checkout',
                documentType: 'deliverable',
                proposalVersion: 1,
                similarityScore: 0.95, // strong
                relevanceCategory: 'strong_match',
                passageText: 'Checkout flow including cart, payment processing, and confirmation.',
                whyRetrieved: 'strong match',
                metadata: {},
              },
            ],
          }),
        },
      });

      const result = await service.analyze({
        projectId,
        approvedProposalVersion: {
          versionNumber: 1,
          title: 'E-Commerce Checkout Proposal v1',
          scopeSummary: 'Full checkout flow including cart, payment and confirmation.',
          scopeItems: [],
        },
        deliverables: [{
          id: 'DEL-CHK-01',
          title: 'Checkout Flow',
          description: 'Checkout flow including cart, payment processing, and confirmation',
          scopeReference: 'DEL-CHK-01',
          acceptanceCriteria: ['Payment validation passes all tests'],
        }],
        newClientRequest: {
          title: 'Checkout page bug fix',
          description: 'Fix payment validation on checkout',
          requestedBy: 'client',
        },
      });

      expect(result.reviewStatus).toBe('in_scope');
    });
  });
});
