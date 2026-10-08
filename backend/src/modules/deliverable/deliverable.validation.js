const { z } = require('zod');
const { ALLOWED_DELIVERABLE_STATUSES } = require('./deliverable.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const deliverableIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid deliverable ID format'),
});

const createDeliverableSchema = z.object({
  project: z.string().regex(objectIdRegex, 'Invalid project ID format'),
  milestone: z.string().regex(objectIdRegex, 'Invalid milestone ID format'),
  title: z.string().min(2, 'Deliverable title must be at least 2 characters').max(200),
  description: z.string().optional().default(''),
  scopeReference: z.string().min(1, 'Scope reference identifier is required'),
  status: z.enum(ALLOWED_DELIVERABLE_STATUSES).optional(),
  acceptanceCriteria: z.array(z.string()).optional().default([]),
});

module.exports = {
  deliverableIdParamSchema,
  createDeliverableSchema,
};
