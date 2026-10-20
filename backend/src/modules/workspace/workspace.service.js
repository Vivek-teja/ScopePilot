const Workspace = require('./workspace.model');
const ApiError = require('../../utils/apiError');
const { WORKSPACE_ROLES } = require('./workspace.constants');

class WorkspaceService {
  /**
   * Create a new workspace with the creator as owner
   */
  async createWorkspace(userId, workspaceData) {
    const { name, slug } = workspaceData;

    const workspace = await Workspace.create({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      owner: userId,
      members: [
        {
          user: userId,
          role: WORKSPACE_ROLES.OWNER,
        },
      ],
    });

    return workspace;
  }

  /**
   * Get workspace by ID
   */
  async getWorkspaceById(workspaceId, userId) {
    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'name email role')
      .populate('members.user', 'name email role');

    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    // Foundation check: ensure requesting user has access
    const ownerId = workspace.owner?._id || workspace.owner;
    const isMember =
      (ownerId && ownerId.toString() === userId.toString()) ||
      (workspace.members &&
        workspace.members.some((m) => {
          const memberUserId = m.user?._id || m.user;
          return memberUserId && memberUserId.toString() === userId.toString();
        }));

    if (!isMember) {
      throw ApiError.forbidden('You do not have access to this workspace');
    }

    return workspace;
  }

  /**
   * Invite a user to the workspace
   */
  async inviteMember(workspaceId, invitedByUserId, invitationData) {
    const { email, role = WORKSPACE_ROLES.MEMBER } = invitationData;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    // Verify requesting user is member and has administrative privileges (owner or admin)
    const ownerId = workspace.owner?._id || workspace.owner;
    const isOwner = ownerId && ownerId.toString() === invitedByUserId.toString();
    const isMember =
      isOwner ||
      (workspace.members &&
        workspace.members.some((m) => {
          const memberUserId = m.user?._id || m.user;
          return memberUserId && memberUserId.toString() === invitedByUserId.toString();
        }));

    if (!isMember) {
      throw ApiError.forbidden('You do not have access to this workspace');
    }

    const isWorkspaceAdmin =
      isOwner ||
      (workspace.members &&
        workspace.members.some((m) => {
          const memberUserId = m.user?._id || m.user;
          return (
            memberUserId &&
            memberUserId.toString() === invitedByUserId.toString() &&
            (m.role === WORKSPACE_ROLES.OWNER || m.role === WORKSPACE_ROLES.ADMIN)
          );
        }));

    if (!isWorkspaceAdmin) {
      throw ApiError.forbidden('You do not have permission to invite members to this workspace');
    }

    // Workspace admins can invite regular members, but cannot invite users with the client role.
    // Only workspace owners can invite users with the client role.
    if (!isOwner && role === WORKSPACE_ROLES.CLIENT) {
      throw ApiError.forbidden('Workspace admins cannot invite users with the client role. Only workspace owners can invite clients.');
    }

    // Validate email syntax and ensure domain is not a disposable or fake domain
    const { validateRealEmail } = require('../../utils/emailValidator');
    const emailCheck = await validateRealEmail(email);
    if (!emailCheck.valid) {
      throw ApiError.badRequest(emailCheck.reason);
    }

    // Check if invitation already exists
    const existingInvite = workspace.invitations.find(
      (inv) => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
    );
    if (existingInvite) {
      throw ApiError.conflict('A pending invitation for this email already exists.');
    }

    // Hybrid auto-link: If DB is connected and user already exists in the system, automatically add to workspace members
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const User = require('../auth/auth.model');
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        const alreadyMember =
          workspace.members &&
          workspace.members.some((m) => {
            const memberUserId = m.user?._id || m.user;
            return memberUserId && memberUserId.toString() === existingUser._id.toString();
          });
        if (!alreadyMember) {
          workspace.members.push({
            user: existingUser._id,
            role,
            joinedAt: new Date(),
          });
        }
      }
    }

    workspace.invitations.push({
      email,
      role,
      invitedBy: invitedByUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    });

    await workspace.save();
    return workspace.invitations[workspace.invitations.length - 1];
  }

  /**
   * Accept an invitation to join a workspace
   */
  async acceptInvitation(workspaceId, userId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const User = require('../auth/auth.model');
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const invite =
      workspace.invitations &&
      workspace.invitations.find(
        (inv) =>
          inv.email &&
          user.email &&
          inv.email.toLowerCase() === user.email.toLowerCase() &&
          inv.status === 'pending'
      );

    if (!invite) {
      const alreadyMember =
        workspace.members &&
        workspace.members.some((m) => {
          const memberUserId = m.user?._id || m.user;
          return memberUserId && memberUserId.toString() === userId.toString();
        });
      if (alreadyMember) {
        return workspace;
      }
      throw ApiError.badRequest('No pending invitation found for your email address');
    }

    invite.status = 'accepted';

    const alreadyMember =
      workspace.members &&
      workspace.members.some((m) => {
        const memberUserId = m.user?._id || m.user;
        return memberUserId && memberUserId.toString() === userId.toString();
      });

    if (!alreadyMember) {
      workspace.members.push({
        user: userId,
        role: invite.role,
        joinedAt: new Date(),
      });
    }

    if (typeof workspace.save === 'function') {
      await workspace.save();
    }
    return workspace;
  }

  /**
   * Get all members of a workspace
   */
  async getWorkspaceMembers(workspaceId, userId) {
    const workspace = await this.getWorkspaceById(workspaceId, userId);
    return workspace.members;
  }

  /**
   * List all workspaces accessible by the user (owned or member)
   */
  async listWorkspaces(userId) {
    const workspaces = await Workspace.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    })
      .populate('owner', 'name email role')
      .populate('members.user', 'name email role')
      .sort({ updatedAt: -1 });
    return workspaces;
  }
}

module.exports = new WorkspaceService();
