const { z } = require('zod');

const RELEVANCE_CATEGORY = {
  STRONG_MATCH: 'strong_match',
  WEAK_MATCH: 'weak_match',
  NO_EVIDENCE: 'no_evidence',
};

const RETRIEVAL_STATUS = {
  CANDIDATE_FOUND: 'candidate_found',
  WEAK_EVIDENCE: 'weak_evidence',
  UNCERTAIN: 'uncertain',
};

const RetrievalQueryInputSchema = z.object({
  query: z
    .string({ required_error: 'Query is required' })
    .min(3, 'Query must be at least 3 characters long')
    .max(1000, 'Query cannot exceed 1000 characters'),
  topK: z.number().int().min(1).max(20).default(3),
  minThreshold: z.number().min(0.0).max(1.0).default(0.40),
  projectId: z.string().optional(),
});

const RetrievedPassageSchema = z.object({
  passageId: z.string(),
  sourceReference: z.string(),
  sourceTitle: z.string(),
  documentType: z.enum(['deliverable', 'proposal_scope_item']),
  proposalVersion: z.number().int().default(1),
  similarityScore: z.number().min(0.0).max(1.0),
  relevanceCategory: z.enum([
    RELEVANCE_CATEGORY.STRONG_MATCH,
    RELEVANCE_CATEGORY.WEAK_MATCH,
    RELEVANCE_CATEGORY.NO_EVIDENCE,
  ]),
  passageText: z.string(),
  whyRetrieved: z.string(),
  metadata: z.record(z.any()).optional(),
});

const RetrievalResultSchema = z.object({
  query: z.string(),
  topMatch: RetrievedPassageSchema.nullable(),
  similarityScore: z.number().min(0.0).max(1.0),
  status: z.enum([
    RETRIEVAL_STATUS.CANDIDATE_FOUND,
    RETRIEVAL_STATUS.WEAK_EVIDENCE,
    RETRIEVAL_STATUS.UNCERTAIN,
  ]),
  retrievedPassages: z.array(RetrievedPassageSchema),
  uncertainReason: z.string().optional(),
  suggestedQuestions: z.array(z.string()).optional(),
  safeguardNotice: z.string(),
  analyzedAt: z.string().datetime(),
});

module.exports = {
  RELEVANCE_CATEGORY,
  RETRIEVAL_STATUS,
  RetrievalQueryInputSchema,
  RetrievedPassageSchema,
  RetrievalResultSchema,
};
