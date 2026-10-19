/**
 * Grounded Scope Chat Contract
 *
 * Implements Section 5 specifications for Project 13 Scope Chat API.
 */

const { z } = require('zod');

const ScopeChatInputSchema = z.object({
  projectId: z.string({ required_error: 'projectId is required' }).min(1),
  question: z
    .string({ required_error: 'question is required' })
    .min(2, 'Question must be at least 2 characters long')
    .max(1000, 'Question cannot exceed 1000 characters'),
  conversationId: z.string().optional(),
  topK: z.number().int().min(1).max(10).default(3),
});

const ChatSourceReferenceSchema = z.object({
  sourceReference: z.string(),
  sourceTitle: z.string(),
  passageText: z.string(),
  similarityScore: z.number(),
});

const ScopeChatOutputSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(ChatSourceReferenceSchema).default([]),
  proposalVersion: z.number().int(),
  hasSufficientEvidence: z.boolean(),
  insufficientEvidenceNotice: z.string().optional(),
  conversationId: z.string(),
  timestamp: z.string().datetime(),
});

module.exports = {
  ScopeChatInputSchema,
  ChatSourceReferenceSchema,
  ScopeChatOutputSchema,
};
