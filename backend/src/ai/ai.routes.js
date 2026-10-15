const { Router } = require('express');
const aiController = require('./ai.controller');
const validate = require('../middleware/validate.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');
const { ChangeAnalysisInputSchema } = require('../contracts/aiAnalysis.contract');

const router = Router();

// Apply authentication middleware (populates req.user if bearer token provided)
router.use(optionalAuth);

// Test cases discovery & execution endpoints
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

module.exports = router;
