const { z } = require('zod');

/**
 * Review Status Enum
 * Represents the AI classification outcome for a change request.
 */
const REVIEW_STATUS = {
  IN_SCOPE: 'in_scope',
  OUT_OF_SCOPE: 'out_of_scope',
  PARTIALLY_OUT_OF_SCOPE: 'partially_out_of_scope',
  NEEDS_CLARIFICATION: 'needs_clarification',
  UNCERTAIN: 'uncertain',
};

const ReviewStatusEnum = z.enum([
  REVIEW_STATUS.IN_SCOPE,
  REVIEW_STATUS.OUT_OF_SCOPE,
  REVIEW_STATUS.PARTIALLY_OUT_OF_SCOPE,
  REVIEW_STATUS.NEEDS_CLARIFICATION,
  REVIEW_STATUS.UNCERTAIN,
]);

/**
 * Proposal Scope Item Schema (from approved ProposalVersion)
 */
const ScopeItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Scope item title is required'),
  description: z.string().default(''),
  estimatedHours: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
});

/**
 * Approved Proposal Version Input Schema
 */
const ApprovedProposalVersionInputSchema = z.object({
  versionNumber: z.number().int().positive('Version number must be positive'),
  title: z.string().min(1, 'Proposal title is required'),
  scopeSummary: z.string().min(1, 'Scope summary is required'),
  scopeItems: z.array(ScopeItemSchema).default([]),
});

/**
 * Deliverable Input Schema (from Deliverable model)
 */
const DeliverableInputSchema = z.object({
  id: z.string().min(1, 'Deliverable ID is required'),
  title: z.string().min(1, 'Deliverable title is required'),
  scopeReference: z.string().min(1, 'Scope reference identifier is required'),
  description: z.string().default(''),
  acceptanceCriteria: z.array(z.string()).default([]),
});

/**
 * Client Change Request Input Schema
 */
const NewClientRequestInputSchema = z.object({
  title: z.string().min(1, 'Change request title is required'),
  description: z.string().min(1, 'Change request description is required'),
  requestedBy: z.string().optional(),
  clientNotes: z.string().optional(),
});

/**
 * Complete Change Analysis Input Contract
 */
const ChangeAnalysisInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  approvedProposalVersion: ApprovedProposalVersionInputSchema,
  deliverables: z.array(DeliverableInputSchema).min(1, 'At least one approved deliverable is required for comparison'),
  newClientRequest: NewClientRequestInputSchema,
  options: z
    .object({
      similarityThreshold: z.number().min(0).max(1).default(0.7),
      strictMode: z.boolean().default(true),
    })
    .default({}),
});

/**
 * Structured Sub-Schemas for AI Analysis Output
 */
const InScopeItemSchema = z.object({
  item: z.string().min(1),
  matchedDeliverableId: z.string().optional(),
  matchedScopeReference: z.string().optional(),
  reason: z.string().min(1),
});

const OutOfScopeItemSchema = z.object({
  item: z.string().min(1),
  reason: z.string().min(1),
  potentialImpact: z.string().optional(),
});

const UncertainItemSchema = z.object({
  item: z.string().min(1),
  question: z.string().min(1),
  missingEvidence: z.string().min(1),
});

const AffectedDeliverableSchema = z.object({
  deliverableId: z.string().min(1),
  scopeReference: z.string().min(1),
  title: z.string().min(1),
  impactDescription: z.string().min(1),
});

const EvidenceItemSchema = z.object({
  sourceReference: z.string().min(1),
  snippet: z.string().min(1),
  relevanceScore: z.number().min(0).max(1).optional(),
});

/**
 * Complete Change Analysis Output Contract
 */
const ChangeAnalysisOutputSchema = z.object({
  summary: z.string().min(1, 'Summary of change analysis is required'),
  reviewStatus: ReviewStatusEnum,
  confidenceScore: z.number().min(0).max(1, 'Confidence score must be between 0.0 and 1.0'),
  inScopeItems: z.array(InScopeItemSchema).default([]),
  outOfScopeItems: z.array(OutOfScopeItemSchema).default([]),
  uncertainItems: z.array(UncertainItemSchema).default([]),
  affectedDeliverables: z.array(AffectedDeliverableSchema).default([]),
  evidence: z.array(EvidenceItemSchema).default([]),
  recommendations: z.array(z.string()).default([]),
  disclaimer: z.string().default(
    'AI analysis is an advisory draft only. Approval or rejection of changes must be finalized by authorized project participants. Cost and schedule adjustments require explicit deterministic calculation.'
  ),
  analyzedAt: z.string().datetime().optional(),
});

module.exports = {
  REVIEW_STATUS,
  ReviewStatusEnum,
  ScopeItemSchema,
  ApprovedProposalVersionInputSchema,
  DeliverableInputSchema,
  NewClientRequestInputSchema,
  ChangeAnalysisInputSchema,
  InScopeItemSchema,
  OutOfScopeItemSchema,
  UncertainItemSchema,
  AffectedDeliverableSchema,
  EvidenceItemSchema,
  ChangeAnalysisOutputSchema,
};
