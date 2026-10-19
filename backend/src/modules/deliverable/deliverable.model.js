const mongoose = require('mongoose');
const { DELIVERABLE_STATUS, ALLOWED_DELIVERABLE_STATUSES } = require('./deliverable.constants');

const evidenceSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
      alias: 'content',
    },
    fileUrls: [
      {
        type: String,
        trim: true,
      },
    ],
    reference: {
      type: String,
      trim: true,
      default: '',
    },
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

const deliverableSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      alias: 'projectId',
      index: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: [true, 'Milestone reference is required'],
      alias: 'milestoneId',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Deliverable title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    scopeReference: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_DELIVERABLE_STATUSES,
        message: '{VALUE} is not a valid deliverable status',
      },
      default: DELIVERABLE_STATUS.PENDING,
      index: true,
    },
    acceptanceCriteria: [
      {
        type: String,
        trim: true,
      },
    ],
    evidence: [evidenceSchema],
  },
  {
    timestamps: true,
  }
);

deliverableSchema.index({ project: 1, milestone: 1 });
deliverableSchema.index({ milestone: 1, status: 1 });

deliverableSchema.set('toJSON', { virtuals: true });
deliverableSchema.set('toObject', { virtuals: true });

const Deliverable = mongoose.model('Deliverable', deliverableSchema);

module.exports = Deliverable;
