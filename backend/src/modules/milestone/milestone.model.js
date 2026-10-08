const mongoose = require('mongoose');
const { MILESTONE_STATUS, ALLOWED_MILESTONE_STATUSES } = require('./milestone.constants');

const evidenceSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrls: [
      {
        type: String,
        trim: true,
      },
    ],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const milestoneDecisionSchema = new mongoose.Schema(
  {
    decision: {
      type: String,
      enum: ['approve', 'reject'],
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    decidedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const milestoneSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [200, 'Milestone title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_MILESTONE_STATUSES,
        message: '{VALUE} is not a valid milestone status',
      },
      default: MILESTONE_STATUS.PENDING,
      index: true,
    },
    dueDate: {
      type: Date,
    },
    order: {
      type: Number,
      default: 1,
    },
    deliverables: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deliverable',
      },
    ],
    evidence: [evidenceSchema],
    decisions: [milestoneDecisionSchema],
  },
  {
    timestamps: true,
  }
);

milestoneSchema.index({ project: 1, order: 1 });

const Milestone = mongoose.model('Milestone', milestoneSchema);

module.exports = Milestone;
