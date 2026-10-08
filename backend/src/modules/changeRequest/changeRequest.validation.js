const { z } = require('zod');
const { ALLOWED_CHANGE_REQUEST_STATUSES, CHANGE_REQUEST_DECISION } = require('./changeRequest.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const changeRequestIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid change request ID format'),
});

const createChangeRequestSchema = z.object({
  project: z.string().regex(objectIdRegex, 'Invalid project ID format'),
  title: z.string().min(2, 'Change request title must be at least 2 characters').max(200),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  status: z.enum(ALLOWED_CHANGE_REQUEST_STATUSES).optional(),
  affectedMilestones: z.array(z.string().regex(objectIdRegex)).optional().default([]),
  relatedDeliverables: z.array(z.string().regex(objectIdRegex)).optional().default([]),
  effortEstimate: z.number().nonnegative().optional().default(0),
  priceAdjustment: z.number().nonnegative().optional().default(0),
  scheduleImpact: z
    .object({
      daysAdded: z.number().int().nonnegative().optional().default(0),
      newTargetDate: z.string().datetime().optional().or(z.date().optional()),
      summary: z.string().optional().default(''),
    })
    .optional(),
});

const changeRequestDecisionSchema = z.object({
  decision: z.enum([CHANGE_REQUEST_DECISION.APPROVE, CHANGE_REQUEST_DECISION.REJECT]),
  comment: z.string().optional().default(''),
});

module.exports = {
  changeRequestIdParamSchema,
  createChangeRequestSchema,
  changeRequestDecisionSchema,
};
