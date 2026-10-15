const { z } = require('zod');
const { ALLOWED_MILESTONE_STATUSES, MILESTONE_DECISION } = require('./milestone.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const milestoneIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid milestone ID format'),
});

const createMilestoneSchema = z
  .object({
    project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    title: z
      .string({ required_error: 'Milestone title is required' })
      .trim()
      .min(2, 'Milestone title must be at least 2 characters')
      .max(200, 'Milestone title cannot exceed 200 characters'),
    description: z.string().trim().optional().default(''),
    status: z
      .enum(ALLOWED_MILESTONE_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${ALLOWED_MILESTONE_STATUSES.join(', ')}` }),
      })
      .optional(),
    dueDate: z
      .union([
        z.string().datetime({ message: 'Due date must be a valid ISO 8601 date string' }),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD or ISO 8601 format'),
        z.date(),
      ])
      .optional()
      .nullable(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .positive('Order must be greater than 0')
      .optional()
      .default(1),
  })
  .refine((data) => data.project || data.projectId, {
    message: 'Project reference is required (provide projectId or project)',
    path: ['projectId'],
  });

const updateMilestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Milestone title must be at least 2 characters')
    .max(200, 'Milestone title cannot exceed 200 characters')
    .optional(),
  description: z.string().trim().optional(),
  status: z
    .enum(ALLOWED_MILESTONE_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${ALLOWED_MILESTONE_STATUSES.join(', ')}` }),
    })
    .optional(),
  dueDate: z
    .union([
      z.string().datetime({ message: 'Due date must be a valid ISO 8601 date string' }),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD or ISO 8601 format'),
      z.date(),
    ])
    .optional()
    .nullable(),
  order: z.number().int().positive('Order must be greater than 0').optional(),
});

const addEvidenceSchema = z
  .object({
    comment: z.string().trim().min(2, 'Evidence comment or content must be at least 2 characters').optional(),
    content: z.string().trim().min(2, 'Evidence comment or content must be at least 2 characters').optional(),
    fileUrls: z.array(z.string().url('Must be a valid URL')).optional().default([]),
    fileUrl: z.string().url('Must be a valid URL').optional(),
    reference: z.string().trim().optional(),
  })
  .refine((data) => data.comment || data.content, {
    message: 'Evidence comment or content is required',
    path: ['comment'],
  });

const milestoneDecisionSchema = z.object({
  decision: z.enum([MILESTONE_DECISION.APPROVE, MILESTONE_DECISION.REJECT], {
    errorMap: () => ({ message: `Decision must be either '${MILESTONE_DECISION.APPROVE}' or '${MILESTONE_DECISION.REJECT}'` }),
  }),
  comment: z.string().trim().optional().default(''),
});

const listMilestonesQuerySchema = z.object({
  project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
  projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
  status: z.enum(ALLOWED_MILESTONE_STATUSES).optional(),
});

module.exports = {
  objectIdRegex,
  milestoneIdParamSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  addEvidenceSchema,
  milestoneDecisionSchema,
  listMilestonesQuerySchema,
};
