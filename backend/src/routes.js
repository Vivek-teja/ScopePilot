const { Router } = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const workspaceRoutes = require('./modules/workspace/workspace.routes');
const projectRoutes = require('./modules/project/project.routes');
const proposalRoutes = require('./modules/proposal/proposal.routes');
const milestoneRoutes = require('./modules/milestone/milestone.routes');
const deliverableRoutes = require('./modules/deliverable/deliverable.routes');
const changeRequestRoutes = require('./modules/changeRequest/changeRequest.routes');

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

module.exports = router;
