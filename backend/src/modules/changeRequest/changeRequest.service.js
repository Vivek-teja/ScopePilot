const ChangeRequest = require('./changeRequest.model');
const Project = require('../project/project.model');
const Workspace = require('../workspace/workspace.model');
const Milestone = require('../milestone/milestone.model');
const Deliverable = require('../deliverable/deliverable.model');
const ApiError = require('../../utils/apiError');
const { CHANGE_REQUEST_STATUS, CHANGE_REQUEST_DECISION } = require('./changeRequest.constants');

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

/**
 * Helper to verify whether a user is an authorized reviewer for change request decisions.
 * Strictly forbids freelancer self-approval and any review decisions by freelancers or requesters.
 * Only designated project clients, workspace owners/admins, or system admins can record decisions.
 */
const checkDecisionAccess = async (project, userId, user = null, changeRequest = null) => {
  if (!project || !userId) return false;

  const freelancerId = project.freelancer?._id || project.freelancer;
  const clientId = project.client?._id || project.client;

  // Freelancer assigned to this project cannot approve or reject change requests
  if (freelancerId && freelancerId.toString() === userId.toString()) {
    return false;
  }

  // Any user with role 'freelancer' cannot record a decision
  if (user && user.role === 'freelancer') {
    return false;
  }

  // Requester cannot approve or reject their own change request (self-approval forbidden)
  if (changeRequest && changeRequest.requestedBy) {
    const requesterId = changeRequest.requestedBy._id || changeRequest.requestedBy;
    if (requesterId.toString() === userId.toString()) {
      return false;
    }
  }

  // System admin can record decisions
  if (user && user.role === 'admin') return true;

  // Designated project client is authorized
  if (clientId && clientId.toString() === userId.toString()) {
    return true;
  }

  // Workspace owner or workspace admin
  if (project.workspace) {
    const workspaceId = project.workspace._id || project.workspace;
    const workspace = await Workspace.findById(workspaceId);
    if (workspace) {
      const isOwner =
        workspace.owner &&
        (workspace.owner._id || workspace.owner).toString() === userId.toString();
      const isWorkspaceAdmin =
        workspace.members &&
        workspace.members.some(
          (m) =>
            (m.user?._id || m.user).toString() === userId.toString() &&
            (m.role === 'owner' || m.role === 'admin')
        );
      if (isOwner || isWorkspaceAdmin) {
        return true;
      }
    }
  }

  return false;
};

class ChangeRequestService {
  /**
   * Create a new change request
   */
  async createChangeRequest(userId, data, user = null) {
    const projectId = data.projectId || data.project;
    const {
      title,
      description,
      status,
      affectedMilestones,
      relatedDeliverables,
      effortEstimate,
      priceAdjustment,
      scheduleImpact,
    } = data;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    // Ensure referenced milestones exist and belong to the same project
    if (affectedMilestones && affectedMilestones.length > 0) {
      const uniqueMilestoneIds = [...new Set(affectedMilestones.map((id) => id.toString()))];
      const milestones = await Milestone.find({ _id: { $in: uniqueMilestoneIds } });
      const allExistAndBelong =
        milestones.length === uniqueMilestoneIds.length &&
        milestones.every(
          (m) => (m.project?._id || m.project).toString() === projectId.toString()
        );
      if (!allExistAndBelong) {
        throw ApiError.badRequest('One or more affected milestones do not belong to this project');
      }
    }

    // Ensure referenced deliverables exist and belong to the same project
    if (relatedDeliverables && relatedDeliverables.length > 0) {
      const uniqueDeliverableIds = [...new Set(relatedDeliverables.map((id) => id.toString()))];
      const deliverables = await Deliverable.find({ _id: { $in: uniqueDeliverableIds } });
      const allExistAndBelong =
        deliverables.length === uniqueDeliverableIds.length &&
        deliverables.every(
          (d) => (d.project?._id || d.project).toString() === projectId.toString()
        );
      if (!allExistAndBelong) {
        throw ApiError.badRequest('One or more related deliverables do not belong to this project');
      }
    }

    const changeRequest = await ChangeRequest.create({
      project: projectId,
      requestedBy: userId,
      title,
      description,
      status: status || CHANGE_REQUEST_STATUS.PENDING_ESTIMATE,
      affectedMilestones: affectedMilestones || [],
      relatedDeliverables: relatedDeliverables || [],
      effortEstimate: effortEstimate || 0,
      priceAdjustment: priceAdjustment || 0,
      scheduleImpact: scheduleImpact || {},
    });

    return changeRequest;
  }

  /**
   * Get change request by ID with populated references and tenancy verification
   */
  async getChangeRequestById(changeRequestId, userId = null, user = null) {
    const changeRequest = await ChangeRequest.findById(changeRequestId)
      .populate('project', 'title status freelancer client workspace currentApprovedProposal')
      .populate('requestedBy', 'name email role')
      .populate('affectedMilestones', 'title status order dueDate')
      .populate('relatedDeliverables', 'title status scopeReference');

    if (!changeRequest) {
      throw ApiError.notFound('Change request not found');
    }

    if (userId) {
      let project = changeRequest.project;
      if (!project || !project._id || !project.freelancer) {
        const projId = project?._id || project;
        if (projId) {
          project = await Project.findById(projId);
        }
      }
      if (project) {
        const hasAccess = await checkProjectAccess(project, userId, user);
        if (!hasAccess) {
          throw ApiError.forbidden('You do not have access to this project');
        }
      }
    }

    return changeRequest;
  }

  /**
   * Record decision on a change request
   */
  async recordDecision(changeRequestId, userIdOrUser, data, user = null) {
    const userObj = user || (userIdOrUser && userIdOrUser.role ? userIdOrUser : null);
    const userId = (userIdOrUser && userIdOrUser._id && userIdOrUser.role) ? userIdOrUser._id : (userIdOrUser?._id || userIdOrUser);

    const { decision, comment } = data || {};

    const changeRequest = await ChangeRequest.findById(changeRequestId);
    if (!changeRequest) {
      throw ApiError.notFound('Change request not found');
    }

    let project = null;
    if (changeRequest.project) {
      if (changeRequest.project.freelancer || changeRequest.project.client) {
        project = changeRequest.project;
      } else {
        const projectId = changeRequest.project._id || changeRequest.project;
        project = await Project.findById(projectId);
      }
    }

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const canReview = await checkDecisionAccess(project, userId, userObj, changeRequest);
    if (!canReview) {
      throw ApiError.forbidden('You are not authorized to record a decision on this change request');
    }

    const isApproved = decision === CHANGE_REQUEST_DECISION.APPROVE;
    const decisionRecord = {
      decision,
      comment: comment || '',
      decidedAt: new Date(),
      decidedBy: userId,
    };

    changeRequest.clientDecision = decisionRecord;
    changeRequest.status = isApproved
      ? CHANGE_REQUEST_STATUS.APPROVED
      : CHANGE_REQUEST_STATUS.REJECTED;

    await changeRequest.save();
    return changeRequest;
  }
}

const serviceInstance = new ChangeRequestService();
serviceInstance.checkProjectAccess = checkProjectAccess;
serviceInstance.checkDecisionAccess = checkDecisionAccess;

module.exports = serviceInstance;
