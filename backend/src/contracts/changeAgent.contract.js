/**
 * Change-Analysis Agent Contract
 *
 * Implements Section 6 specifications for POST /api/change-agent:
 * - Logical tool inputs & outputs
 * - Tool execution logging
 * - Bound agent workflow output
 */

const { z } = require('zod');
const { ReviewStatusEnum } = require('./aiAnalysis.contract');

const ChangeAgentInputSchema = z.object({
  projectId: z.string({ required_error: 'projectId is required' }).min(1),
  changeRequestId: z.string().optional(),
  requestTitle: z.string({ required_error: 'requestTitle is required' }).min(1),
  requestDescription: z.string({ required_error: 'requestDescription is required' }).min(1),
  requestedBy: z.string().optional(),
  developerCapacityHoursPerDay: z.number().positive().default(6),
  storedHourlyRate: z.number().positive().default(100),
});

const ToolExecutionLogSchema = z.object({
  toolName: z.string(),
  status: z.enum(['success', 'failed']),
  durationMs: z.number().nonnegative(),
  error: z.string().optional(),
});

const ScheduleImpactToolOutputSchema = z.object({
  estimatedHours: z.number().nullable(),
  scheduleImpactDays: z.number().nullable(),
  estimatedCost: z.number().nullable(),
  calculationBasis: z.string(),
  isEligibleForBilling: z.boolean(),
});

const ChangeAgentOutputSchema = z.object({
  agentRunId: z.string(),
  projectId: z.string(),
  proposalVersionNumber: z.number().int(),
  reviewStatus: ReviewStatusEnum,
  confidenceScore: z.number().min(0.0).max(1.0),
  summary: z.string().min(1),
  evidence: z.array(z.any()).default([]),
  inScopeItems: z.array(z.any()).default([]),
  outOfScopeItems: z.array(z.any()).default([]),
  uncertainItems: z.array(z.any()).default([]),
  affectedDeliverables: z.array(z.any()).default([]),
  scheduleImpact: ScheduleImpactToolOutputSchema,
  humanReviewDraftNotice: z.string().default(
    'ADVISORY DRAFT ONLY: The Change-Analysis Agent possesses zero authority to approve or reject change requests. Final contractual decisions remain strictly with authorized human participants.'
  ),
  toolLogs: z.array(ToolExecutionLogSchema).default([]),
  completedAt: z.string().datetime(),
});

module.exports = {
  ChangeAgentInputSchema,
  ToolExecutionLogSchema,
  ScheduleImpactToolOutputSchema,
  ChangeAgentOutputSchema,
};
