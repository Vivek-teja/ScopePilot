const { z } = require('zod');
const { ALLOWED_DELIVERABLE_STATUSES } = require('./deliverable.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const deliverableIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid deliverable ID format'),
});

const createDeliverableSchema = z
  .object({
    project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    milestone: z.string().regex(objectIdRegex, 'Invalid milestone ID format').optional(),
    milestoneId: z.string().regex(objectIdRegex, 'Invalid milestone ID format').optional(),
    title: z
      .string({ required_error: 'Deliverable title is required' })
      .trim()
      .min(2, 'Deliverable title must be at least 2 characters')
      .max(200, 'Deliverable title cannot exceed 200 characters'),
    description: z.string().trim().optional().default(''),
    scopeReference: z.string().trim().optional().default(''),
    status: z
      .enum(ALLOWED_DELIVERABLE_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${ALLOWED_DELIVERABLE_STATUSES.join(', ')}` }),
      })
      .optional(),
    acceptanceCriteria: z.array(z.string().trim()).optional().default([]),
  })
  .refine((data) => data.project || data.projectId, {
    message: 'Project reference is required (provide projectId or project)',
    path: ['projectId'],
  })
  .refine((data) => data.milestone || data.milestoneId, {
    message: 'Milestone reference is required (provide milestoneId or milestone)',
    path: ['milestoneId'],
  });

const updateDeliverableSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Deliverable title must be at least 2 characters')
    .max(200, 'Deliverable title cannot exceed 200 characters')
    .optional(),
  description: z.string().trim().optional(),
  scopeReference: z.string().trim().optional(),
  status: z
    .enum(ALLOWED_DELIVERABLE_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${ALLOWED_DELIVERABLE_STATUSES.join(', ')}` }),
    })
    .optional(),
  acceptanceCriteria: z.array(z.string().trim()).optional(),
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

const listDeliverablesQuerySchema = z.object({
  milestone: z.string().regex(objectIdRegex, 'Invalid milestone ID format').optional(),
  milestoneId: z.string().regex(objectIdRegex, 'Invalid milestone ID format').optional(),
  project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
  projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
  status: z.enum(ALLOWED_DELIVERABLE_STATUSES).optional(),
});

module.exports = {
  objectIdRegex,
  deliverableIdParamSchema,
  createDeliverableSchema,
  updateDeliverableSchema,
  addEvidenceSchema,
  listDeliverablesQuerySchema,
};
