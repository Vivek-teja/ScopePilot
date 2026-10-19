const { Router } = require('express');
const aiController = require('./ai.controller');
const validate = require('../middleware/validate.middleware');
const { optionalAuth, requireAuth } = require('../middleware/auth.middleware');
const { ChangeAnalysisInputSchema } = require('../contracts/aiAnalysis.contract');
const { RetrievalQueryInputSchema } = require('../contracts/retrieval.contract');
const { GroundedAgentInputSchema } = require('../contracts/agentAnalysis.contract');
const {
  aiProviderRateLimit,
  aiBenchmarkRateLimit,
} = require('./middleware/aiRateLimiter.middleware');

const router = Router();

// Apply authentication middleware (populates req.user if bearer token provided)
// Does NOT enforce login on its own — individual routes add requireAuth where needed.
router.use(optionalAuth);

// ── Review 2: Deterministic Mock Engine Endpoints (PUBLIC — no provider calls) ──
// These use the local rule-based mock service only. No AI provider is invoked.
// Safe to be public: they expose only static sample e-commerce test fixture data.
router.get('/cases', aiController.getCases);
router.get('/cases/run-all', aiController.runAllCases);
router.get('/cases/:caseId', aiController.getCaseById);
router.get('/cases/:caseId/run', aiController.runCase);
router.post('/cases/:caseId/run', aiController.runCase);

// Dynamic mock analysis endpoint — uses rule-based mock service, no provider calls
// PUBLIC: safe for demo use
router.post(
  '/analyze-mock',
  validate({ body: ChangeAnalysisInputSchema }),
  aiController.analyzeMock
);

// ── Review 3: Semantic Retrieval & Embedding Endpoints ───────────────────────
// These use the local in-memory corpus service only. No AI provider is invoked.
// Safe to be public: they expose only static sample scope passage data.
router.get('/rag/corpus', aiController.getCorpus);
router.get('/rag/experiments', aiController.getRetrievalExperiments);
router.get('/rag/experiments/run', aiController.runRetrievalExperiments);

// POST /rag/retrieve — local cosine retrieval, no provider calls (PUBLIC demo)
router.post(
  '/rag/retrieve',
  validate({ body: RetrievalQueryInputSchema }),
  aiController.retrieveScope
);

// ── Review 4 & 5: Grounded Agent & Provider Endpoints ─────────────────────────

// POST /agent/analyze — REQUIRES LOGIN + RATE LIMIT
// Calls AI provider (may incur API cost). Reads project data from database.
// requireAuth: unauthenticated callers get 401 before any DB or provider call.
// aiProviderRateLimit: 20 calls/min per user.
router.post(
  '/agent/analyze',
  requireAuth,
  aiProviderRateLimit,
  validate({ body: GroundedAgentInputSchema }),
  aiController.analyzeAgent
);

// GET /agent/providers — PUBLIC
// Returns a list of provider names and availability status. No project data or provider calls.
router.get('/agent/providers', aiController.getProviders);

// POST /agent/providers/select — REQUIRES LOGIN
// Saves per-user provider preference. No provider call.
router.post('/agent/providers/select', requireAuth, aiController.selectProvider);

// GET /agent/benchmark — REQUIRES LOGIN + STRICTER RATE LIMIT
// Runs 5 grounded-agent calls sequentially. With a cloud provider configured this
// would incur 5 paid API calls per request, so login is mandatory.
// aiBenchmarkRateLimit: 5 runs per user per 5 minutes.
router.get('/agent/benchmark', requireAuth, aiBenchmarkRateLimit, aiController.runAgentBenchmark);

// ── Production Grounded Scope Chat & Change Agent (all REQUIRE LOGIN + RATE LIMIT) ──
// All three routes call AI providers or access private project data.

// POST /scope-chat — REQUIRES LOGIN + RATE LIMIT
router.post('/scope-chat', requireAuth, aiProviderRateLimit, aiController.scopeChat);

// POST /change-agent — REQUIRES LOGIN + RATE LIMIT
router.post('/change-agent', requireAuth, aiProviderRateLimit, aiController.changeAgent);

// POST /scope-analysis-db — REQUIRES LOGIN + RATE LIMIT (accesses private project data)
router.post('/scope-analysis-db', requireAuth, aiProviderRateLimit, aiController.analyzeProjectScopeDb);

// POST /rag/ingest — REQUIRES LOGIN + RATE LIMIT (writes to vector store for a specific project)
router.post('/rag/ingest', requireAuth, aiProviderRateLimit, aiController.ingestScope);

module.exports = router;
