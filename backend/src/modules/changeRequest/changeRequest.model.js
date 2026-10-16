const mongoose = require('mongoose');
const { CHANGE_REQUEST_STATUS, ALLOWED_CHANGE_REQUEST_STATUSES } = require('./changeRequest.constants');

const decisionSchema = new mongoose.Schema(
  {
    decision: {
      type: String,
      enum: ['approve', 'reject', 'request_revision'],
    },
    comment: {
      type: String,
      default: '',
    },
    decidedAt: {
      type: Date,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const scheduleImpactSchema = new mongoose.Schema(
  {
    daysAdded: {
      type: Number,
      default: 0,
    },
    newTargetDate: {
      type: Date,
    },
    summary: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

/**
 * Extension schemas for future AI integration (MongoDB Atlas Vector Search & RAG)
 */
const aiAnalysisExtensionSchema = new mongoose.Schema(
  {
    summary: { type: String, default: '' },
    confidenceScore: { type: Number, min: 0, max: 1 },
    rawOutput: { type: mongoose.Schema.Types.Mixed },
    analyzedAt: { type: Date },
  },
  { _id: false }
);

const scopeComparisonExtensionSchema = new mongoose.Schema(
  {
    outOfScopeItems: [{ type: String }],
    inScopeItems: [{ type: String }],
    similarityScore: { type: Number, min: 0, max: 1 },
  },
  { _id: false }
);

const changeRequestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requested by user reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Change request title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Change request description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_CHANGE_REQUEST_STATUSES,
        message: '{VALUE} is not a valid change request status',
      },
      default: CHANGE_REQUEST_STATUS.DRAFT,
      index: true,
    },
    affectedMilestones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Milestone',
      },
    ],
    relatedDeliverables: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deliverable',
      },
    ],
    effortEstimate: {
      type: Number,
      default: 0,
      min: 0,
    },
    priceAdjustment: {
      type: Number,
      default: 0,
      min: 0,
    },
    scheduleImpact: scheduleImpactSchema,
    freelancerDecision: decisionSchema,
    clientDecision: decisionSchema,

    // Future AI extension fields
    aiAnalysis: aiAnalysisExtensionSchema,
    scopeComparison: scopeComparisonExtensionSchema,
    retrievedScopeReferences: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

changeRequestSchema.index({ project: 1, status: 1 });

const ChangeRequest = mongoose.model('ChangeRequest', changeRequestSchema);

module.exports = ChangeRequest;
