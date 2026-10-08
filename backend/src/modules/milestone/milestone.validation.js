const { z } = require('zod');
const { ALLOWED_MILESTONE_STATUSES, MILESTONE_DECISION } = require('./milestone.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const milestoneIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid milestone ID format'),
});

const createMilestoneSchema = z.object({
  project: z.string().regex(objectIdRegex, 'Invalid project ID format'),
  title: z.string().min(2, 'Milestone title must be at least 2 characters').max(200),
  description: z.string().optional().default(''),
  status: z.enum(ALLOWED_MILESTONE_STATUSES).optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  order: z.number().int().positive().optional().default(1),
});

const addEvidenceSchema = z.object({
  comment: z.string().min(2, 'Evidence comment must be at least 2 characters'),
  fileUrls: z.array(z.string().url('Must be a valid URL')).optional().default([]),
});

const milestoneDecisionSchema = z.object({
  decision: z.enum([MILESTONE_DECISION.APPROVE, MILESTONE_DECISION.REJECT]),
  comment: z.string().optional().default(''),
});

module.exports = {
  milestoneIdParamSchema,
  createMilestoneSchema,
  addEvidenceSchema,
  milestoneDecisionSchema,
};
