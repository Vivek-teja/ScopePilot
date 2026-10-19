const { Router } = require('express');
const aiController = require('./ai.controller');
const validate = require('../middleware/validate.middleware');
const { optionalAuth, requireAuth } = require('../middleware/auth.middleware');
const { ChangeAnalysisInputSchema } = require('../contracts/aiAnalysis.contract');
const { RetrievalQueryInputSchema } = require('../contracts/retrieval.contract');
const { GroundedAgentInputSchema } = require('../contracts/agentAnalysis.contract');

const router = Router();

// Apply authentication middleware (populates req.user if bearer token provided)
router.use(optionalAuth);

// ── Review 2: Deterministic Mock Engine Endpoints ────────────────────────────
router.get('/cases', aiController.getCases);
router.get('/cases/run-all', aiController.runAllCases);
router.get('/cases/:caseId', aiController.getCaseById);
router.get('/cases/:caseId/run', aiController.runCase);
router.post('/cases/:caseId/run', aiController.runCase);

// Dynamic mock analysis endpoint validating input contract with Zod
router.post(
  '/analyze-mock',
  validate({ body: ChangeAnalysisInputSchema }),
  aiController.analyzeMock
);

// ── Review 3: Semantic Retrieval & Embedding Endpoints ───────────────────────
router.get('/rag/corpus', aiController.getCorpus);
router.get('/rag/experiments', aiController.getRetrievalExperiments);
router.get('/rag/experiments/run', aiController.runRetrievalExperiments);

router.post(
  '/rag/retrieve',
  validate({ body: RetrievalQueryInputSchema }),
  aiController.retrieveScope
);

// ── Review 4 & 5: Grounded Agent & Provider Endpoints ─────────────────────────
router.post(
  '/agent/analyze',
  requireAuth,
  validate({ body: GroundedAgentInputSchema }),
  aiController.analyzeAgent
);

router.get('/agent/providers', aiController.getProviders);
router.post('/agent/providers/select', requireAuth, aiController.selectProvider);
router.get('/agent/benchmark', aiController.runAgentBenchmark);

module.exports = router;
