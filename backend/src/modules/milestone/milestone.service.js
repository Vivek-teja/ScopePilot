const Milestone = require('./milestone.model');
const Project = require('../project/project.model');
const Workspace = require('../workspace/workspace.model');
const ApiError = require('../../utils/apiError');
const { MILESTONE_STATUS, MILESTONE_DECISION } = require('./milestone.constants');

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

class MilestoneService {
  /**
   * Create a new milestone for a project
   */
  async createMilestone(userId, milestoneData, user = null) {
    const projectId = milestoneData.projectId || milestoneData.project;
    const { title, description, status, dueDate, order } = milestoneData;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const milestone = await Milestone.create({
      project: projectId,
      title,
      description,
      status: status || MILESTONE_STATUS.PENDING,
      dueDate: dueDate || null,
      order: order || 1,
    });

    return milestone;
  }

  /**
   * Get milestone by ID with deliverables and evidence
   */
  async getMilestoneById(milestoneId, userId = null, user = null) {
    const milestone = await Milestone.findById(milestoneId)
      .populate('project', 'title status freelancer client workspace')
      .populate('deliverables')
      .populate('evidence.submittedBy', 'name email')
      .populate('decisions.decidedBy', 'name email');

    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    if (userId && milestone.project) {
      const hasAccess = await checkProjectAccess(milestone.project, userId, user);
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this project');
      }
    }

    return milestone;
  }

  /**
   * Update an existing milestone
   */
  async updateMilestone(milestoneId, userId, updateData, user = null) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    const project = await Project.findById(milestone.project);
    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    if (updateData.title !== undefined) milestone.title = updateData.title;
    if (updateData.description !== undefined) milestone.description = updateData.description;
    if (updateData.status !== undefined) milestone.status = updateData.status;
    if (updateData.dueDate !== undefined) milestone.dueDate = updateData.dueDate;
    if (updateData.order !== undefined) milestone.order = updateData.order;

    await milestone.save();
    return milestone;
  }

  /**
   * Add evidence / progress proof to milestone
   */
  async addEvidence(milestoneId, userId, evidenceData, user = null) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    const project = await Project.findById(milestone.project);
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

    milestone.evidence.push(newEvidence);
    milestone.status = MILESTONE_STATUS.SUBMITTED;
    await milestone.save();

    return milestone;
  }

  /**
   * Record client decision on milestone completion
   */
  async recordDecision(milestoneId, userId, { decision, comment }, user = null) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    if (milestone.project) {
      const project = await Project.findById(milestone.project);
      if (project) {
        const hasAccess = await checkProjectAccess(project, userId, user);
        if (!hasAccess) {
          throw ApiError.forbidden('You are not authorized to record a decision on this milestone');
        }
      }
    }

    const isApproved = decision === MILESTONE_DECISION.APPROVE;
    const newStatus = isApproved ? MILESTONE_STATUS.APPROVED : MILESTONE_STATUS.REJECTED;

    const newDecision = {
      decision,
      comment: comment || '',
      decidedBy: userId,
      decidedAt: new Date(),
    };

    milestone.decisions.push(newDecision);
    milestone.status = newStatus;
    await milestone.save();

    return milestone;
  }

  /**
   * List milestones for a project
   */
  async listMilestones(userId, query = {}, user = null) {
    const projectId = query.projectId || query.project;
    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        const hasAccess = await checkProjectAccess(project, userId, user);
        if (!hasAccess) {
          throw ApiError.forbidden('You do not have access to this project');
        }
      }
    }

    const filter = {};
    if (projectId) {
      filter.project = projectId;
    }
    if (query.status) {
      filter.status = query.status;
    }

    return Milestone.find(filter)
      .populate('project', 'title status freelancer client')
      .populate('deliverables')
      .sort({ order: 1, createdAt: 1 });
  }
}

module.exports = new MilestoneService();
