const Deliverable = require('./deliverable.model');
const Milestone = require('../milestone/milestone.model');
const Project = require('../project/project.model');
const Workspace = require('../workspace/workspace.model');
const ApiError = require('../../utils/apiError');
const { DELIVERABLE_STATUS } = require('./deliverable.constants');

/**
 * Helper to verify whether a user has access to a project
 */
const checkProjectAccess = async (project, userId, user = null) => {
  if (!project || !userId) return false;

  // Admin users bypass project restrictions
  if (user && user.role === 'admin') return true;

  const freelancerId = project.freelancer?._id || project.freelancer;
  const clientId = project.client?._id || project.client;

  if (freelancerId && freelancerId.toString() === userId.toString()) {
    return true;
  }
  if (clientId && clientId.toString() === userId.toString()) {
    return true;
  }

  // Check workspace membership if project belongs to a workspace
  if (project.workspace) {
    const workspaceId = project.workspace._id || project.workspace;
    const workspace = await Workspace.findById(workspaceId);
    if (workspace) {
      const isOwner =
        workspace.owner &&
        (workspace.owner._id || workspace.owner).toString() === userId.toString();
      const isMember =
        workspace.members &&
        workspace.members.some(
          (m) => (m.user?._id || m.user).toString() === userId.toString()
        );
      if (isOwner || isMember) {
        return true;
      }
    }
  }

  return false;
};

class DeliverableService {
  /**
   * Create a new deliverable and associate it with a milestone
   */
  async createDeliverable(userId, deliverableData, user = null) {
    const projectId = deliverableData.projectId || deliverableData.project;
    const milestoneId = deliverableData.milestoneId || deliverableData.milestone;
    const { title, description, scopeReference, status, acceptanceCriteria } = deliverableData;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    const milestoneProjectId = milestone.project ? milestone.project.toString() : milestone.projectId?.toString();
    if (milestoneProjectId && milestoneProjectId !== projectId.toString()) {
      throw ApiError.badRequest('Milestone does not belong to the specified project');
    }

    const deliverable = await Deliverable.create({
      project: projectId,
      milestone: milestoneId,
      title,
      description,
      scopeReference,
      status: status || DELIVERABLE_STATUS.PENDING,
      acceptanceCriteria: acceptanceCriteria || [],
    });

    // Add deliverable reference to milestone
    if (!milestone.deliverables.includes(deliverable._id)) {
      milestone.deliverables.push(deliverable._id);
      await milestone.save();
    }

    return deliverable;
  }

  /**
   * Get deliverable by ID
   */
  async getDeliverableById(deliverableId, userId = null, user = null) {
    const deliverable = await Deliverable.findById(deliverableId)
      .populate('project', 'title status freelancer client workspace')
      .populate('milestone', 'title status order')
      .populate('evidence.submittedBy', 'name email');

    if (!deliverable) {
      throw ApiError.notFound('Deliverable not found');
    }

    if (userId && deliverable.project) {
      const hasAccess = await checkProjectAccess(deliverable.project, userId, user);
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this project');
      }
    }

    return deliverable;
  }

  /**
   * Update an existing deliverable
   */
  async updateDeliverable(deliverableId, userId, updateData, user = null) {
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      throw ApiError.notFound('Deliverable not found');
    }

    const project = await Project.findById(deliverable.project);
    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    if (updateData.title !== undefined) deliverable.title = updateData.title;
    if (updateData.description !== undefined) deliverable.description = updateData.description;
    if (updateData.status !== undefined) deliverable.status = updateData.status;
    if (updateData.scopeReference !== undefined) deliverable.scopeReference = updateData.scopeReference;
    if (updateData.acceptanceCriteria !== undefined) deliverable.acceptanceCriteria = updateData.acceptanceCriteria;

    await deliverable.save();
    return deliverable;
  }

  /**
   * Add evidence / progress proof to deliverable
   */
  async addEvidence(deliverableId, userId, evidenceData, user = null) {
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      throw ApiError.notFound('Deliverable not found');
    }

    const project = await Project.findById(deliverable.project);
    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const comment = evidenceData.comment || evidenceData.content;
    let fileUrls = Array.isArray(evidenceData.fileUrls) ? [...evidenceData.fileUrls] : [];
    if (evidenceData.fileUrl && !fileUrls.includes(evidenceData.fileUrl)) {
      fileUrls.push(evidenceData.fileUrl);
    }
    const reference = evidenceData.reference || (fileUrls.length > 0 ? fileUrls[0] : '');

    const newEvidence = {
      comment,
      content: comment,
      fileUrls,
      reference,
      submittedBy: userId,
      submittedAt: new Date(),
    };

    deliverable.evidence.push(newEvidence);
    deliverable.status = DELIVERABLE_STATUS.COMPLETED;
    await deliverable.save();

    return deliverable;
  }

  /**
   * Get all deliverables scoped to a project or milestone with access verification
   */
  async listDeliverables(userId, query = {}, user = null) {
    const projectId = query.projectId || query.project;
    const milestoneId = query.milestoneId || query.milestone;

    if (!projectId && !milestoneId) {
      throw ApiError.badRequest('Project reference is required');
    }

    const filter = {};

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const hasAccess = await checkProjectAccess(project, userId, user);
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      filter.project = projectId;
    }

    if (milestoneId) {
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        throw ApiError.notFound('Milestone not found');
      }

      const mProjectId = milestone.project
        ? (milestone.project._id || milestone.project).toString()
        : milestone.projectId?.toString();

      if (projectId && mProjectId && mProjectId !== projectId.toString()) {
        throw ApiError.badRequest('Milestone does not belong to the specified project');
      }

      // If projectId was not explicitly provided in query, verify access via the milestone's project
      if (!projectId && mProjectId) {
        const project = await Project.findById(mProjectId);
        if (!project) {
          throw ApiError.notFound('Project not found');
        }
        const hasAccess = await checkProjectAccess(project, userId, user);
        if (!hasAccess) {
          throw ApiError.forbidden('You do not have access to this project');
        }
        filter.project = mProjectId;
      }

      filter.milestone = milestoneId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    return Deliverable.find(filter)
      .populate('project', 'title status freelancer client')
      .populate('milestone', 'title status order')
      .sort({ createdAt: 1 });
  }

  /**
   * Get all deliverables for a milestone
   */
  async getDeliverablesByMilestone(milestoneId) {
    return Deliverable.find({ milestone: milestoneId }).sort({ createdAt: 1 });
  }
}

module.exports = new DeliverableService();
