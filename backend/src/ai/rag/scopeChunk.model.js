/**
 * ScopeChunk Model
 *
 * Stores vectorized approved-scope chunks for MongoDB Atlas Vector Search
 * and RAG retrieval. Strictly scoped to workspace and project.
 */

const mongoose = require('mongoose');

const CHUNK_DOCUMENT_TYPES = ['proposal', 'deliverable', 'pdf', 'txt', 'scope_item'];
const CHUNK_STATUSES = ['pending', 'processing', 'ready', 'failed'];

const scopeChunkSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required for chunk scoping'],
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace reference is required for multi-tenant isolation'],
      index: true,
    },
    proposalVersion: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      trim: true,
    },
    documentType: {
      type: String,
      enum: CHUNK_DOCUMENT_TYPES,
      default: 'deliverable',
      index: true,
    },
    sectionReference: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    embeddingModel: {
      type: String,
      default: 'nomic-embed-text',
    },
    embeddingDimension: {
      type: Number,
      default: 1024,
    },
    status: {
      type: String,
      enum: CHUNK_STATUSES,
      default: 'ready',
      index: true,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique content hash per project to prevent duplicate chunk ingestion
scopeChunkSchema.index({ project: 1, contentHash: 1 }, { unique: true });
scopeChunkSchema.index({ project: 1, proposalVersion: 1, status: 1 });
const ScopeChunk = mongoose.model('ScopeChunk', scopeChunkSchema);

ScopeChunk.ScopeChunk = ScopeChunk;
ScopeChunk.CHUNK_DOCUMENT_TYPES = CHUNK_DOCUMENT_TYPES;
ScopeChunk.CHUNK_STATUSES = CHUNK_STATUSES;

module.exports = ScopeChunk;
