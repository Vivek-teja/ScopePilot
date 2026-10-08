const mongoose = require('mongoose');
const { PROJECT_STATUS, ALLOWED_PROJECT_STATUSES } = require('./project.constants');

const projectSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace reference is required'],
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Freelancer reference is required'],
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [200, 'Project title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_PROJECT_STATUSES,
        message: '{VALUE} is not a valid project status',
      },
      default: PROJECT_STATUS.DRAFT,
      index: true,
    },
    currentApprovedProposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProposalVersion',
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ workspace: 1, status: 1 });
projectSchema.index({ freelancer: 1, client: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
