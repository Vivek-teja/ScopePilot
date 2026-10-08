const mongoose = require('mongoose');
const { WORKSPACE_ROLES, ALLOWED_WORKSPACE_ROLES, INVITATION_STATUS, ALLOWED_INVITATION_STATUSES } = require('./workspace.constants');

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ALLOWED_WORKSPACE_ROLES,
      default: WORKSPACE_ROLES.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const workspaceInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ALLOWED_WORKSPACE_ROLES,
      default: WORKSPACE_ROLES.MEMBER,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ALLOWED_INVITATION_STATUSES,
      default: INVITATION_STATUS.PENDING,
    },
    token: {
      type: String,
      select: false,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [120, 'Workspace name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace owner is required'],
      index: true,
    },
    members: [workspaceMemberSchema],
    invitations: [workspaceInvitationSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
workspaceSchema.index({ 'members.user': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
