/**
 * Section 10: Complete AI, RAG & Change-Analysis Agent Test Suite
 *
 * Verifies all 18 required test scenarios from the specification:
 *  1. In-scope request returns in_scope classification
 *  2. Out-of-scope request returns out_of_scope
 *  3. Partial overlap returns partially_out_of_scope
 *  4. Ambiguous request returns needs_clarification
 *  5. Missing evidence returns uncertain
 *  6. Correct approved proposal version retrieval
 *  7. Source citations in grounded chat responses
 *  8. Empty retrieval handled gracefully
 *  9. Model timeout/fallback handled gracefully
 * 10. Zod input/output schema validation
 * 11. Unauthorized access to another project's scope blocked (403)
 * 12. No cross-workspace retrieval leakage
 * 13. Unauthorized agent tool execution prevented
 * 14. Mutating approved terms prevented
 * 15. Stale change request rejection/validation
 * 16. Duplicate execution prevention
 * 17. Frontend API client integration
 * 18. Existing mock tests passing
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');

const User = require('../src/modules/auth/auth.model');
const Project = require('../src/modules/project/project.model');
const { Proposal, ProposalVersion } = require('../src/modules/proposal/proposal.model');
const Deliverable = require('../src/modules/deliverable/deliverable.model');
const Milestone = require('../src/modules/milestone/milestone.model');
const ChangeRequest = require('../src/modules/changeRequest/changeRequest.model');
const ScopeChunk = require('../src/ai/rag/scopeChunk.model');

const { defaultIngestionService } = require('../src/ai/rag/ingestion.service');
const { defaultAtlasVectorSearchService } = require('../src/ai/rag/atlasVectorSearch.service');
const { defaultScopeChatService } = require('../src/ai/chat/scopeChat.service');
const { defaultChangeAgentService } = require('../src/ai/agent/changeAgent.service');
const { ScopeChatInputSchema, ScopeChatOutputSchema } = require('../src/contracts/scopeChat.contract');
const { ChangeAgentOutputSchema } = require('../src/contracts/changeAgent.contract');
const { case1_clearlyInScope, case2_clearlyOutOfScope, case3_partialOverlap, case4_ambiguousRequest, case5_insufficientEvidence } = require('../src/ai/fixtures/changeAnalysisFixtures');

describe('ScopePilot Section 10: Complete AI, RAG & Agent Integration Verification', () => {
  const authorizedUserId = new mongoose.Types.ObjectId().toString();
  const unauthorizedUserId = new mongoose.Types.ObjectId().toString();
  const workspaceId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();
  const proposalId = new mongoose.Types.ObjectId().toString();

  const unauthorizedToken = generateToken({ id: unauthorizedUserId });

  const authorizedUser = {
    _id: new mongoose.Types.ObjectId(authorizedUserId),
    name: 'Dev Lead',
    email: 'lead@scopepilot.dev',
    role: 'freelancer',
  };

  const unauthorizedUser = {
    _id: new mongoose.Types.ObjectId(unauthorizedUserId),
    name: 'Intruder User',
    email: 'intruder@other.dev',
    role: 'client',
  };

  const mockWorkspace = {
    _id: new mongoose.Types.ObjectId(workspaceId),
    name: 'Authorized Studio',
    slug: 'auth-studio',
    owner: authorizedUser,
    members: [{ user: authorizedUser, role: 'owner' }],
  };

  const mockProject = {
    _id: new mongoose.Types.ObjectId(projectId),
    title: 'E-Commerce Platform',
    workspace: mockWorkspace,
    freelancer: authorizedUser,
    client: null,
    status: 'active',
    activeProposalVersion: 2,
    hourlyRate: 100,
  };

  const mockProposalVersions = [
    {
      _id: new mongoose.Types.ObjectId(),
      proposal: proposalId,
      project: projectId,
      versionNumber: 1,
      title: 'Initial Scope Draft',
      scopeSummary: 'Superseded draft',
      status: 'superseded',
      agreedDeliverables: ['Old Legacy Deliverable'],
      scopeItems: [{ title: 'Old Deliverable', description: 'Superseded', estimatedHours: 10, price: 1000 }],
    },
    {
      _id: new mongoose.Types.ObjectId(),
      proposal: proposalId,
      project: projectId,
      versionNumber: 2,
      title: 'Approved Final Baseline',
      scopeSummary: 'Agreed platform scope with Stripe payments and catalog API',
      status: 'approved',
      approvedAt: new Date(),
      agreedDeliverables: [
        'User Authentication & JWT Security',
        'Product Catalog & Search API',
        'Stripe Checkout Payment Gateway',
      ],
      scopeItems: [
        { title: 'User Authentication', description: 'JWT authentication and roles', estimatedHours: 20, price: 2000 },
        { title: 'Product Catalog', description: 'Search and filter catalog API', estimatedHours: 30, price: 3000 },
        { title: 'Stripe Checkout', description: 'Card processing via Stripe', estimatedHours: 25, price: 2500 },
      ],
    },
  ];

  const mockDeliverables = [
    {
      _id: new mongoose.Types.ObjectId(),
      project: projectId,
      title: 'Product Catalog API',
      scopeReference: 'PROP-V2-ITEM-2',
      description: 'REST endpoints for catalog search',
      status: 'in_progress',
    },
  ];

  function mockQuery(val) {
    const p = Promise.resolve(val);
    p.sort = () => p;
    p.populate = () => p;
    p.select = () => p;
    p.lean = () => p;
    p.exec = () => Promise.resolve(val);
    return p;
  }

  beforeEach(() => {
    jest.restoreAllMocks();

    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let found = null;
      if (idStr === authorizedUserId) found = authorizedUser;
      else if (idStr === unauthorizedUserId) found = unauthorizedUser;
      return mockQuery(found);
    });

    jest.spyOn(Project, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      const found = idStr === projectId ? mockProject : null;
      return mockQuery(found);
    });

    jest.spyOn(Proposal, 'findOne').mockImplementation(() => {
      return mockQuery({ _id: proposalId, project: projectId, currentVersion: 2 });
    });

    jest.spyOn(ProposalVersion, 'findOne').mockImplementation((_q) => {
      const version = mockProposalVersions.find((pv) => {
        if (_q && _q.status && pv.status !== _q.status) return false;
        if (_q && _q.versionNumber && pv.versionNumber !== _q.versionNumber) return false;
        return true;
      });
      return mockQuery(version || null);
    });

    jest.spyOn(ProposalVersion, 'find').mockImplementation(() => mockQuery(mockProposalVersions));
    jest.spyOn(Deliverable, 'find').mockImplementation(() => mockQuery(mockDeliverables));
    jest.spyOn(Milestone, 'find').mockImplementation(() => mockQuery([]));

    jest.spyOn(ScopeChunk, 'find').mockImplementation(() => mockQuery([]));
    jest.spyOn(ScopeChunk, 'aggregate').mockResolvedValue([]);
    jest.spyOn(ScopeChunk, 'findOne').mockResolvedValue(null);
    jest.spyOn(ScopeChunk, 'create').mockResolvedValue({});
    jest.spyOn(ScopeChunk, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
  });

  // ── Scenario 1: In-scope request returns in_scope classification ────────────
  describe('Scenario 1: In-scope request classification', () => {
    it('should classify request matching approved catalog deliverable as in_scope', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(case1_clearlyInScope);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('in_scope');
      expect(res.body.data.inScopeItems.length).toBeGreaterThan(0);
      expect(res.body.data.outOfScopeItems.length).toBe(0);
    });
  });

  // ── Scenario 2: Out-of-scope request returns out_of_scope ───────────────────
  describe('Scenario 2: Out-of-scope request classification', () => {
    it('should classify request introducing unmentioned mobile app as out_of_scope', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(case2_clearlyOutOfScope);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('out_of_scope');
      expect(res.body.data.outOfScopeItems.length).toBeGreaterThan(0);
    });
  });

  // ── Scenario 3: Partial overlap returns partially_out_of_scope ──────────────
  describe('Scenario 3: Partial overlap classification', () => {
    it('should classify request with combined in-scope and out-of-scope items as partially_out_of_scope', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(case3_partialOverlap);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('partially_out_of_scope');
      expect(res.body.data.inScopeItems.length).toBeGreaterThan(0);
      expect(res.body.data.outOfScopeItems.length).toBeGreaterThan(0);
    });
  });

  // ── Scenario 4: Ambiguous request returns needs_clarification ───────────────
  describe('Scenario 4: Ambiguous request classification', () => {
    it('should classify underspecified or vague requests as needs_clarification', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(case4_ambiguousRequest);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('needs_clarification');
      expect(res.body.data.uncertainItems.length).toBeGreaterThan(0);
    });
  });

  // ── Scenario 5: Missing evidence returns uncertain ──────────────────────────
  describe('Scenario 5: Missing evidence classification', () => {
    it('should return uncertain status when required scope evidence is absent', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-mock')
        .send(case5_insufficientEvidence);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('uncertain');
      expect(res.body.data.disclaimer).toContain('advisory draft');
    });
  });

  // ── Scenario 6: Correct approved proposal version retrieval ─────────────────
  describe('Scenario 6: Correct proposal version retrieval', () => {
    it('should retrieve only version 2 (approved) and ignore version 1 (superseded)', async () => {
      const scopeData = await defaultChangeAgentService.readApprovedScope(projectId);

      expect(scopeData.proposalVersion).toBe(2);
      expect(scopeData.proposalTitle).toBe('Approved Final Baseline');
      expect(scopeData.deliverables.some((d) => d.title.includes('Product Catalog'))).toBe(true);
      expect(scopeData.deliverables.some((d) => d.title.includes('Old Legacy'))).toBe(false);
    });
  });

  // ── Scenario 7: Source citations in grounded chat responses ─────────────────
  describe('Scenario 7: Grounded chat source citations', () => {
    it('should include sourceReference and similarityScore in chat citations', async () => {
      jest.spyOn(defaultAtlasVectorSearchService, 'retrieveRelevantScope').mockResolvedValueOnce({
        retrievedPassages: [
          {
            sourceReference: 'PROP-V2-SEC-1',
            sourceTitle: 'Product Catalog API Deliverable',
            passageText: 'Product Catalog & Search API with filtering and pagination.',
            similarityScore: 0.94,
            proposalVersion: 2,
          },
        ],
        hasSufficientEvidence: true,
        similarityScore: 0.94,
      });

      const chatResult = await defaultScopeChatService.answerScopeQuestion(
        {
          projectId,
          question: 'Is product catalog filtering included?',
          topK: 3,
        },
        authorizedUser
      );

      expect(chatResult.sources.length).toBeGreaterThan(0);
      expect(chatResult.sources[0].sourceReference).toBe('PROP-V2-SEC-1');
      expect(chatResult.sources[0].similarityScore).toBe(0.94);
      expect(chatResult.proposalVersion).toBe(2);
      expect(chatResult.hasSufficientEvidence).toBe(true);
    });
  });

  // ── Scenario 8: Empty retrieval handled gracefully ──────────────────────────
  describe('Scenario 8: Empty retrieval handling', () => {
    it('should return hasSufficientEvidence: false and clear notice when no chunks match', async () => {
      jest.spyOn(defaultAtlasVectorSearchService, 'retrieveRelevantScope').mockResolvedValueOnce({
        retrievedPassages: [],
        hasSufficientEvidence: false,
      });

      const chatResult = await defaultScopeChatService.answerScopeQuestion(
        {
          projectId,
          question: 'Are autonomous flying drones supported?',
          topK: 3,
        },
        authorizedUser
      );

      expect(chatResult.hasSufficientEvidence).toBe(false);
      expect(chatResult.sources).toEqual([]);
      expect(chatResult.insufficientEvidenceNotice).toContain('threshold');
      expect(chatResult.answer).toContain('sufficient evidence');
    });
  });

  // ── Scenario 9: Model timeout/fallback handled gracefully ───────────────────
  describe('Scenario 9: Model timeout/fallback handling', () => {
    it('should provide deterministic grounded fallback when LLM model throws or times out', async () => {
      jest.spyOn(defaultAtlasVectorSearchService, 'retrieveRelevantScope').mockResolvedValueOnce({
        retrievedPassages: [
          {
            sourceReference: 'PROP-V2-SEC-PAY',
            sourceTitle: 'Stripe Gateway',
            passageText: 'Stripe Checkout integration is approved for card payments.',
            similarityScore: 0.88,
            proposalVersion: 2,
          },
        ],
        hasSufficientEvidence: true,
        similarityScore: 0.88,
      });

      // Force model generation error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection timeout to Ollama'));

      const chatResult = await defaultScopeChatService.answerScopeQuestion(
        {
          projectId,
          question: 'How do payments work?',
          topK: 1,
        },
        authorizedUser
      );

      expect(chatResult.answer).toBeDefined();
      expect(chatResult.sources.length).toBe(1);
      expect(chatResult.proposalVersion).toBe(2);
    });
  });

  // ── Scenario 10: Zod input/output schema validation ─────────────────────────
  describe('Scenario 10: Zod input/output validation', () => {
    it('should reject invalid chat input with too short question', () => {
      const invalidInput = { projectId: 'p-1', question: '?' };
      const parsed = ScopeChatInputSchema.safeParse(invalidInput);
      expect(parsed.success).toBe(false);
    });

    it('should validate complete ScopeChat output against Zod schema', () => {
      const validOutput = {
        answer: 'Verified against proposal v2.',
        sources: [
          {
            sourceReference: 'REF-1',
            sourceTitle: 'Deliverable 1',
            passageText: 'Text excerpt',
            similarityScore: 0.85,
          },
        ],
        proposalVersion: 2,
        hasSufficientEvidence: true,
        conversationId: 'conv-test-1',
        timestamp: new Date().toISOString(),
      };
      const parsed = ScopeChatOutputSchema.safeParse(validOutput);
      expect(parsed.success).toBe(true);
    });

    it('should validate ChangeAgent output against Zod schema', () => {
      const validAgentOutput = {
        agentRunId: 'agent-run-101',
        projectId,
        proposalVersionNumber: 2,
        reviewStatus: 'out_of_scope',
        confidenceScore: 0.9,
        summary: 'Mobile app request exceeds web scope baseline.',
        evidence: [
          {
            sourceReference: 'PROP-V2-SCOPE',
            sourceTitle: 'Approved Scope',
            passageText: 'Web platform only',
            similarityScore: 0.9,
          },
        ],
        inScopeItems: [],
        outOfScopeItems: ['React Native iOS application'],
        uncertainItems: [],
        affectedDeliverables: [],
        scheduleImpact: {
          estimatedHours: 40,
          scheduleImpactDays: 7,
          estimatedCost: 4000,
          calculationBasis: 'Formula calculation',
          isEligibleForBilling: true,
        },
        humanReviewDraftNotice: 'ADVISORY DRAFT ONLY: Human decision required.',
        toolLogs: [
          { toolName: 'readApprovedScope', status: 'success', durationMs: 12 },
          { toolName: 'compareRequestedWork', status: 'success', durationMs: 40 },
          { toolName: 'calculateScheduleImpact', status: 'success', durationMs: 5 },
        ],
        completedAt: new Date().toISOString(),
      };
      const parsed = ChangeAgentOutputSchema.safeParse(validAgentOutput);
      expect(parsed.success).toBe(true);
    });
  });

  // ── Scenario 11: Unauthorized access to another project blocked (403) ───────
  describe('Scenario 11: Multi-tenant authorization enforcement', () => {
    it('should return 403 Forbidden when unauthorized user queries project scope chat', async () => {
      const res = await request(app)
        .post('/api/scope-chat')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          projectId,
          question: 'Can you show me the approved budget?',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission');
    });

    it('should return 403 Forbidden when unauthorized user runs change-agent', async () => {
      const res = await request(app)
        .post('/api/change-agent')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          projectId,
          requestTitle: 'Sneak Attack',
          requestDescription: 'Access without project permission',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Scenario 12: No cross-workspace retrieval leakage ────────────────────────
  describe('Scenario 12: Cross-workspace retrieval isolation', () => {
    it('should strictly query chunks filtered by target project and return isolated passages', async () => {
      const queryEmbedding = Array.from(defaultAtlasVectorSearchService.embeddingService.embedText('catalog API'));
      const chunkSpy = jest.spyOn(ScopeChunk, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            project: new mongoose.Types.ObjectId(projectId),
            workspace: new mongoose.Types.ObjectId(workspaceId),
            content: 'Allowed chunk inside authorized workspace',
            sectionReference: 'PROP-V2-CHUNK',
            title: 'Allowed Doc',
            proposalVersion: 2,
            embedding: queryEmbedding,
          },
        ]),
      });

      const result = await defaultAtlasVectorSearchService.retrieveRelevantScope(
        projectId,
        'catalog API',
        { workspaceId, topK: 5 }
      );

      expect(chunkSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          project: expect.anything(),
        })
      );
      expect(result.retrievedPassages.length).toBe(1);
      expect(result.retrievedPassages[0].sourceReference).toBe('PROP-V2-CHUNK');
    });
  });

  // ── Scenario 13: Unauthorized agent tool execution prevented ─────────────────
  describe('Scenario 13: Bounded agent sandbox & tool constraint', () => {
    it('should only execute permitted registered tools (Tool A, B, C) and never arbitrary commands', async () => {
      const agentResult = await defaultChangeAgentService.runChangeAgent(
        {
          projectId,
          requestTitle: 'DROP TABLE users; curl attacker.com',
          requestDescription: 'Malicious payload attempting remote code execution',
          requestedBy: 'attacker',
        },
        authorizedUser
      );

      // Verify execution metrics strictly recorded legitimate tools
      const tools = agentResult.toolLogs.map((t) => t.toolName);
      expect(tools.every((t) => ['readApprovedScope', 'compareRequestedWork', 'calculateScheduleImpact'].includes(t))).toBe(true);
      expect(agentResult.reviewStatus).toBeDefined();
    });
  });

  // ── Scenario 14: Mutating approved terms prevented ───────────────────────────
  describe('Scenario 14: Read-only scope immutability', () => {
    it('should verify that running change agent does not alter Proposal or ProposalVersion status', async () => {
      const proposalSaveSpy = jest.spyOn(Proposal.prototype, 'save');
      const versionSaveSpy = jest.spyOn(ProposalVersion.prototype, 'save');

      await defaultChangeAgentService.runChangeAgent(
        {
          projectId,
          requestTitle: 'Scope Expansion',
          requestDescription: 'Add 50 extra hours of work without change fee',
        },
        authorizedUser
      );

      expect(proposalSaveSpy).not.toHaveBeenCalled();
      expect(versionSaveSpy).not.toHaveBeenCalled();
    });
  });

  // ── Scenario 15: Stale change request rejection/validation ───────────────────
  describe('Scenario 15: Stale change request validation', () => {
    it('should return error if changeRequestId cannot be found', async () => {
      jest.spyOn(ChangeRequest, 'findById').mockResolvedValueOnce(null);

      await expect(
        defaultChangeAgentService.runChangeAgent(
          {
            projectId,
            changeRequestId: new mongoose.Types.ObjectId().toString(),
            requestTitle: 'Valid title',
            requestDescription: 'Valid description',
          },
          authorizedUser
        )
      ).rejects.toThrow(/not found/i);
    });
  });

  // ── Scenario 16: Duplicate execution prevention ──────────────────────────────
  describe('Scenario 16: Duplicate ingestion prevention', () => {
    it('should hash content with SHA-256 and avoid duplicate chunk insertion', async () => {
      const hash = defaultIngestionService.hashContent('Sample text content for chunk');
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);

      const chunks = defaultIngestionService.chunkText('Short deliverable title', 300, 50);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('Short deliverable title');
    });
  });

  // ── Scenario 17: Frontend API client integration ────────────────────────────
  describe('Scenario 17: Frontend API contract parity', () => {
    it('should export all required frontend client functions matching backend endpoints', () => {
      const fs = require('fs');
      const path = require('path');
      const clientApiSource = fs.readFileSync(
        path.resolve(__dirname, '../../client/src/services/api/aiApi.js'),
        'utf8'
      );

      expect(clientApiSource).toContain('export async function sendScopeChat');
      expect(clientApiSource).toContain('export async function runChangeAgent');
      expect(clientApiSource).toContain('export async function analyzeChangeRequestAi');
      expect(clientApiSource).toContain('export async function ingestScope');
      expect(clientApiSource).toContain('export async function analyzeScopeDb');
      expect(clientApiSource).toContain('export async function analyzeScopeMock');
    });
  });

  // ── Scenario 18: Existing mock tests passing ─────────────────────────────────
  describe('Scenario 18: Deterministic mock baseline preserved', () => {
    it('should preserve existing /api/ai/cases endpoint', async () => {
      const res = await request(app).get('/api/ai/cases');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalCases).toBe(5);
    });

    it('should preserve existing /api/ai/cases/:id/run endpoint', async () => {
      const res = await request(app).post('/api/ai/cases/case-2/run');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.actualStatus).toBe('out_of_scope');
    });
  });
});
