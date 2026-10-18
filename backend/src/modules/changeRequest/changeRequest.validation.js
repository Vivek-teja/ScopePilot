const { z } = require('zod');
const {
  CHANGE_REQUEST_STATUS,
  ALLOWED_CHANGE_REQUEST_STATUSES,
  CHANGE_REQUEST_DECISION,
} = require('./changeRequest.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const changeRequestIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid change request ID format'),
});

const createChangeRequestSchema = z
  .object({
    project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    title: z.string().min(2, 'Change request title must be at least 2 characters').max(200),
    description: z.string().min(5, 'Description must be at least 5 characters'),
    status: z
      .enum([CHANGE_REQUEST_STATUS.DRAFT, CHANGE_REQUEST_STATUS.PENDING_ESTIMATE], {
        errorMap: () => ({
          message: `Initial status must be either '${CHANGE_REQUEST_STATUS.DRAFT}' or '${CHANGE_REQUEST_STATUS.PENDING_ESTIMATE}'`,
        }),
      })
      .optional(),
    affectedMilestones: z.array(z.string().regex(objectIdRegex, 'Invalid milestone ID format')).optional().default([]),
    relatedDeliverables: z.array(z.string().regex(objectIdRegex, 'Invalid deliverable ID format')).optional().default([]),
    effortEstimate: z
      .number({ invalid_type_error: 'Effort estimate must be a number' })
      .finite('Effort estimate must be a finite number')
      .nonnegative('Effort estimate cannot be negative')
      .optional()
      .default(0),
    priceAdjustment: z
      .number({ invalid_type_error: 'Price adjustment must be a number' })
      .finite('Price adjustment must be a finite number')
      .nonnegative('Price adjustment cannot be negative')
      .optional()
      .default(0),
    scheduleImpact: z
      .object({
        daysAdded: z.number().int().nonnegative().optional().default(0),
        newTargetDate: z.string().datetime().optional().or(z.date().optional()),
        summary: z.string().optional().default(''),
      })
      .optional(),
  })
  .refine((data) => data.project || data.projectId, {
    message: 'Project reference is required (provide projectId or project)',
    path: ['projectId'],
  });

const changeRequestDecisionSchema = z.object({
  decision: z.enum([CHANGE_REQUEST_DECISION.APPROVE, CHANGE_REQUEST_DECISION.REJECT], {
    errorMap: () => ({
      message: `Decision must be either '${CHANGE_REQUEST_DECISION.APPROVE}' or '${CHANGE_REQUEST_DECISION.REJECT}'`,
    }),
  }),
  comment: z.string().trim().optional().default(''),
});

const listChangeRequestsQuerySchema = z
  .object({
    project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    status: z.enum(ALLOWED_CHANGE_REQUEST_STATUSES).optional(),
  })
  .refine((data) => data.project || data.projectId, {
    message: 'Project reference is required to list change requests (provide projectId or project)',
    path: ['projectId'],
  });

module.exports = {
  changeRequestIdParamSchema,
  createChangeRequestSchema,
  changeRequestDecisionSchema,
  listChangeRequestsQuerySchema,
};
