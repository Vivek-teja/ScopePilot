const Project = require('./project.model');
const Workspace = require('../workspace/workspace.model');
const User = require('../auth/auth.model');
const ApiError = require('../../utils/apiError');
const { PROJECT_STATUS } = require('./project.constants');

class ProjectService {
  /**
   * Create a new project under a workspace
   */
  async createProject(userId, projectData) {
    const workspaceId = projectData.workspace || projectData.workspaceId;
    const clientId = projectData.client || projectData.clientId;
    const { title, description, status } = projectData;

    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    // Verify user belongs to workspace (owner or member)
    const isMember =
      workspace.owner.toString() === userId.toString() ||
      workspace.members.some(
        (m) => (m.user && (m.user._id || m.user).toString()) === userId.toString()
      );

    if (!isMember) {
      throw ApiError.forbidden('You do not belong to this workspace');
    }

    // If client is specified, verify client exists and is a member of this workspace
    if (clientId) {
      const clientUser = await User.findById(clientId);
      if (!clientUser) {
        throw ApiError.notFound('Client user not found');
      }

      const isClientInWorkspace =
        workspace.owner.toString() === clientId.toString() ||
        workspace.members.some(
          (m) => (m.user && (m.user._id || m.user).toString()) === clientId.toString()
        );

      if (!isClientInWorkspace) {
        throw ApiError.badRequest('Specified client is not a member of this workspace');
      }
    }

    const project = await Project.create({
      workspace: workspaceId,
      freelancer: userId,
      client: clientId || null,
      title,
      description: description || '',
      status: status || PROJECT_STATUS.DRAFT,
    });

    return project;
  }

  /**
   * Get project by ID with populated references
   */
  async getProjectById(projectId, userId) {
    const project = await Project.findById(projectId)
      .populate('workspace', 'name slug owner')
      .populate('freelancer', 'name email role')
      .populate('client', 'name email role')
      .populate('currentApprovedProposal');

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Access check: User must be freelancer, client, or workspace member
    const isFreelancer =
      project.freelancer &&
      (project.freelancer._id || project.freelancer).toString() === userId.toString();

    const isClient =
      project.client &&
      (project.client._id || project.client).toString() === userId.toString();

    const isWorkspaceOwner =
      project.workspace &&
      project.workspace.owner &&
      (project.workspace.owner._id || project.workspace.owner).toString() === userId.toString();

    let isWorkspaceMember = false;
    if (!isFreelancer && !isClient && !isWorkspaceOwner && project.workspace) {
      const workspaceId = project.workspace._id || project.workspace;
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        isWorkspaceMember =
          workspace.owner.toString() === userId.toString() ||
          workspace.members.some(
            (m) => (m.user && (m.user._id || m.user).toString()) === userId.toString()
          );
      }
    }

    if (!isFreelancer && !isClient && !isWorkspaceOwner && !isWorkspaceMember) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return project;
  }

  /**
   * List projects accessible to the user (optionally scoped by workspace)
   */
  async listProjects(userId, query = {}) {
    const targetWorkspaceId = query.workspace || query.workspaceId;
    let filter = {};

    if (targetWorkspaceId) {
      const workspace = await Workspace.findById(targetWorkspaceId);
      if (!workspace) {
        throw ApiError.notFound('Workspace not found');
      }

      const isMember =
        workspace.owner.toString() === userId.toString() ||
        workspace.members.some(
          (m) => (m.user && (m.user._id || m.user).toString()) === userId.toString()
        );

      if (!isMember) {
        throw ApiError.forbidden('You do not have access to this workspace');
      }

      filter.workspace = targetWorkspaceId;
      filter.$or = [
        { freelancer: userId },
        { client: userId },
        { workspace: targetWorkspaceId },
      ];
    } else {
      const userWorkspaces = await Workspace.find({
        $or: [{ owner: userId }, { 'members.user': userId }],
      }).select('_id');
      const workspaceIds = userWorkspaces.map((w) => w._id);

      filter = {
        $or: [
          { freelancer: userId },
          { client: userId },
          { workspace: { $in: workspaceIds } },
        ],
      };
    }

    if (query.status) {
      filter.status = query.status;
    }

    const projects = await Project.find(filter)
      .populate('workspace', 'name slug owner')
      .populate('freelancer', 'name email role')
      .populate('client', 'name email role')
      .sort({ createdAt: -1 });

    return projects;
  }
}

module.exports = new ProjectService();
