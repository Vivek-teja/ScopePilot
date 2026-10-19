const mongoose = require('mongoose');
const { PROPOSAL_STATUS, ALLOWED_PROPOSAL_STATUSES } = require('./proposal.constants');

/**
 * Proposal Version Schema
 * Stores immutable snapshots of proposals when submitted/approved.
 */
const proposalVersionSchema = new mongoose.Schema(
  {
    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      required: [true, 'Proposal reference is required'],
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: [true, 'Proposal title is required'],
      trim: true,
    },
    scopeSummary: {
      type: String,
      required: [true, 'Scope summary is required'],
    },
    scopeItems: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        estimatedHours: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
      },
    ],
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    status: {
      type: String,
      enum: ALLOWED_PROPOSAL_STATUSES,
      default: PROPOSAL_STATUS.DRAFT,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decidedAt: {
      type: Date,
    },
    decisionComment: {
      type: String,
      default: '',
    },
    contentHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

proposalVersionSchema.index({ proposal: 1, versionNumber: 1 }, { unique: true });

/**
 * Proposal Container Schema
 */
const proposalSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    currentVersionNumber: {
      type: Number,
      default: 1,
    },
    activeVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProposalVersion',
    },
    status: {
      type: String,
      enum: ALLOWED_PROPOSAL_STATUSES,
      default: PROPOSAL_STATUS.DRAFT,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ProposalVersion = mongoose.model('ProposalVersion', proposalVersionSchema);
const Proposal = mongoose.model('Proposal', proposalSchema);

module.exports = {
  Proposal,
  ProposalVersion,
};
