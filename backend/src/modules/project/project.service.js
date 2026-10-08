const Project = require('./project.model');
const Workspace = require('../workspace/workspace.model');
const ApiError = require('../../utils/apiError');
const { PROJECT_STATUS } = require('./project.constants');

class ProjectService {
  /**
   * Create a new project under a workspace
   */
  async createProject(userId, projectData) {
    const { workspace: workspaceId, client, title, description, status } = projectData;

    // Verify workspace exists and user has membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw ApiError.notFound('Workspace not found');
    }

    const isMember =
      workspace.owner.toString() === userId.toString() ||
      workspace.members.some((m) => m.user.toString() === userId.toString());

    if (!isMember) {
      throw ApiError.forbidden('You do not belong to this workspace');
    }

    const project = await Project.create({
      workspace: workspaceId,
      freelancer: userId,
      client: client || null,
      title,
      description,
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

    // Access check
    const isFreelancer = project.freelancer._id.toString() === userId.toString();
    const isClient = project.client && project.client._id.toString() === userId.toString();
    const isWorkspaceOwner =
      project.workspace && project.workspace.owner.toString() === userId.toString();

    if (!isFreelancer && !isClient && !isWorkspaceOwner) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return project;
  }
}

module.exports = new ProjectService();
