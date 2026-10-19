const { Router } = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const workspaceRoutes = require('./modules/workspace/workspace.routes');
const projectRoutes = require('./modules/project/project.routes');
const proposalRoutes = require('./modules/proposal/proposal.routes');
const milestoneRoutes = require('./modules/milestone/milestone.routes');
const deliverableRoutes = require('./modules/deliverable/deliverable.routes');
const changeRequestRoutes = require('./modules/changeRequest/changeRequest.routes');
const aiRoutes = require('./ai/ai.routes');
const aiController = require('./ai/ai.controller');
const { requireAuth } = require('./middleware/auth.middleware');
const { aiProviderRateLimit } = require('./ai/middleware/aiRateLimiter.middleware');

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ScopePilot API is running',
  });
});

// Module Route Registrations
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/proposals', proposalRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/deliverables', deliverableRoutes);
router.use('/change-requests', changeRequestRoutes);
router.use('/ai', aiRoutes);

// Project 13 API Contract Direct Endpoints
// These mirror /api/ai/scope-chat and /api/ai/change-agent but at the top-level path
// requireAuth + aiProviderRateLimit applied here as well (defense in depth)
router.post('/scope-chat', requireAuth, aiProviderRateLimit, aiController.scopeChat);
router.post('/change-agent', requireAuth, aiProviderRateLimit, aiController.changeAgent);


module.exports = router;

