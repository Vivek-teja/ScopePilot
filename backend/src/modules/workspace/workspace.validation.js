const { z } = require('zod');
const { ALLOWED_WORKSPACE_ROLES } = require('./workspace.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const workspaceIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid workspace ID format'),
});

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(120),
  slug: z.string().optional(),
});

const createInvitationSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  role: z.enum(ALLOWED_WORKSPACE_ROLES).optional(),
});

module.exports = {
  workspaceIdParamSchema,
  createWorkspaceSchema,
  createInvitationSchema,
};
