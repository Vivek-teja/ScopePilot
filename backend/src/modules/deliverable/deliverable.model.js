const mongoose = require('mongoose');
const { DELIVERABLE_STATUS, ALLOWED_DELIVERABLE_STATUSES } = require('./deliverable.constants');

const deliverableSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: [true, 'Milestone reference is required'],
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
      required: [true, 'Scope reference identifier is required for scope-audit compatibility'],
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

deliverableSchema.index({ project: 1, milestone: 1 });

const Deliverable = mongoose.model('Deliverable', deliverableSchema);

module.exports = Deliverable;
