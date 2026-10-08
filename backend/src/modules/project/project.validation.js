const { z } = require('zod');
const { ALLOWED_PROJECT_STATUSES } = require('./project.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const projectIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid project ID format'),
});

const createProjectSchema = z.object({
  workspace: z.string().regex(objectIdRegex, 'Invalid workspace ID format'),
  client: z.string().regex(objectIdRegex, 'Invalid client user ID format').optional(),
  title: z.string().min(2, 'Project title must be at least 2 characters').max(200),
  description: z.string().optional().default(''),
  status: z.enum(ALLOWED_PROJECT_STATUSES).optional(),
});

module.exports = {
  projectIdParamSchema,
  createProjectSchema,
};
