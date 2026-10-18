const { z } = require('zod');
const { PROPOSAL_DECISION } = require('./proposal.constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const proposalIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid proposal ID format'),
});

const scopeItemSchema = z.object({
  title: z.string().min(1, 'Scope item title is required'),
  description: z.string().optional().default(''),
  estimatedHours: z.number().nonnegative().optional().default(0),
  price: z.number().nonnegative().optional().default(0),
});

const createProposalSchema = z
  .object({
    project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    title: z.string().min(2, 'Proposal title must be at least 2 characters'),
    scopeSummary: z.string().min(5, 'Scope summary must be at least 5 characters'),
    scopeItems: z.array(scopeItemSchema).optional().default([]),
    totalBudget: z.number().nonnegative('Total budget must be a non-negative number'),
    currency: z.string().optional().default('USD'),
  })
  .refine((data) => data.project || data.projectId, {
    message: 'Project ID is required (either project or projectId)',
    path: ['project'],
  });

const proposalDecisionSchema = z.object({
  decision: z.enum([PROPOSAL_DECISION.APPROVE, PROPOSAL_DECISION.REJECT]),
  comment: z.string().optional().default(''),
});

const createProposalVersionSchema = z.object({
  title: z.string().min(2, 'Proposal title must be at least 2 characters').optional(),
  scopeSummary: z.string().min(5, 'Scope summary must be at least 5 characters'),
  scopeItems: z.array(scopeItemSchema).optional().default([]),
  totalBudget: z.number().nonnegative('Total budget must be a non-negative number'),
  currency: z.string().optional().default('USD'),
});

const proposalVersionParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid proposal ID format'),
  versionNumber: z.coerce.number().int().positive('Version number must be a positive integer'),
});

const listProposalsQuerySchema = z
  .object({
    project: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
    projectId: z.string().regex(objectIdRegex, 'Invalid project ID format').optional(),
  })
  .refine((data) => data.project || data.projectId, {
    message: 'Project reference is required to list proposals (provide projectId or project)',
    path: ['projectId'],
  });

module.exports = {
  proposalIdParamSchema,
  createProposalSchema,
  proposalDecisionSchema,
  createProposalVersionSchema,
  proposalVersionParamSchema,
  listProposalsQuerySchema,
};
