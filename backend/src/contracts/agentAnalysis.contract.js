/**
 * Grounded AI Agent Change Analysis Contracts
 *
 * Implements Review 4 & Review 5 specifications:
 * - Bounded comparison combining retrieved scope passages with model reasoning
 * - Validated structured outputs with Zod schemas
 * - Deterministic effort/schedule calculation tool linkage
 * - Human-review advisory notice preserving approval authority
 */

const { z } = require('zod');
const {
  REVIEW_STATUS,
  ReviewStatusEnum,
  InScopeItemSchema,
  OutOfScopeItemSchema,
  UncertainItemSchema,
  AffectedDeliverableSchema,
  DeliverableInputSchema,
  ApprovedProposalVersionInputSchema,
  NewClientRequestInputSchema,
} = require('./aiAnalysis.contract');
const { RetrievedPassageSchema } = require('./retrieval.contract');
const { EffortCalculationResultSchema } = require('../ai/tools/effortCalculator.tool');

/**
 * Model Execution Metadata Schema
 */
const ModelMetadataSchema = z.object({
  provider: z.enum(['local', 'ollama', 'gemini', 'groq', 'huggingface']),
  modelName: z.string(),
  executionTimeMs: z.number().nonnegative(),
  fallbackUsed: z.boolean(),
  isDeterministic: z.boolean(),
});

/**
 * Full Grounded Agent Analysis Input Schema
 */
const GroundedAgentInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  approvedProposalVersion: ApprovedProposalVersionInputSchema,
  deliverables: z
    .array(DeliverableInputSchema)
    .min(1, 'At least one deliverable is required for comparison'),
  newClientRequest: NewClientRequestInputSchema,
  preferredProvider: z
    .enum(['local', 'ollama', 'gemini', 'groq', 'huggingface'])
    .optional(),
  storedHourlyRate: z.number().positive().default(100),
  topK: z.number().int().min(1).max(10).default(3),
  minRetrievalThreshold: z.number().min(0).max(1).default(0.35),
});

/**
 * Full Grounded Agent Analysis Output Schema
 */
const GroundedAgentOutputSchema = z.object({
  analysisId: z.string(),
  summary: z.string().min(1, 'Summary of change analysis is required'),
  reviewStatus: ReviewStatusEnum,
  confidenceScore: z.number().min(0.0).max(1.0),
  retrievedEvidence: z.array(RetrievedPassageSchema),
  inScopeItems: z.array(InScopeItemSchema).default([]),
  outOfScopeItems: z.array(OutOfScopeItemSchema).default([]),
  uncertainItems: z.array(UncertainItemSchema).default([]),
  affectedDeliverables: z.array(AffectedDeliverableSchema).default([]),
  effortCalculation: EffortCalculationResultSchema,
  suggestedQuestions: z.array(z.string()).default([]),
  humanReviewDraftNotice: z.string().default(
    'ADVISORY DRAFT ONLY: This analysis is generated as a structured recommendation for human project managers and clients. The AI agent holds zero authority to approve or reject change requests. Final contractual decisions remain with authorized project participants.'
  ),
  modelMetadata: ModelMetadataSchema,
  analyzedAt: z.string().datetime(),
});

module.exports = {
  REVIEW_STATUS,
  ReviewStatusEnum,
  ModelMetadataSchema,
  GroundedAgentInputSchema,
  GroundedAgentOutputSchema,
};
