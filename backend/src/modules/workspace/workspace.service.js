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

    // Check if invitation already exists
    const existingInvite = workspace.invitations.find(
      (inv) => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
    );
    if (existingInvite) {
      throw ApiError.conflict('A pending invitation for this email already exists.');
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
   * Get all members of a workspace
   */
  async getWorkspaceMembers(workspaceId, userId) {
    const workspace = await this.getWorkspaceById(workspaceId, userId);
    return workspace.members;
  }
}

module.exports = new WorkspaceService();
