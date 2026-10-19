const { Router } = require('express');
const workspaceController = require('./workspace.controller');
const {
  createWorkspaceSchema,
  workspaceIdParamSchema,
  createInvitationSchema,
} = require('./workspace.validation');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = Router();

// All workspace routes require authentication
router.use(requireAuth);

router.post('/', validate({ body: createWorkspaceSchema }), workspaceController.createWorkspace);
router.get('/', workspaceController.listWorkspaces);
router.get('/:id', validate({ params: workspaceIdParamSchema }), workspaceController.getWorkspaceById);
router.post(
  '/:id/invitations',
  validate({ params: workspaceIdParamSchema, body: createInvitationSchema }),
  workspaceController.inviteMember
);
router.get(
  '/:id/members',
  validate({ params: workspaceIdParamSchema }),
  workspaceController.getWorkspaceMembers
);

module.exports = router;
