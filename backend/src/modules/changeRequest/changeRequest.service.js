const ChangeRequest = require('./changeRequest.model');
const Project = require('../project/project.model');
const ApiError = require('../../utils/apiError');
const { CHANGE_REQUEST_STATUS, CHANGE_REQUEST_DECISION } = require('./changeRequest.constants');

class ChangeRequestService {
  /**
   * Create a new change request
   */
  async createChangeRequest(userId, data) {
    const {
      project: projectId,
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
   * Get change request by ID with populated references
   */
  async getChangeRequestById(changeRequestId) {
    const changeRequest = await ChangeRequest.findById(changeRequestId)
      .populate('project', 'title status freelancer client currentApprovedProposal')
      .populate('requestedBy', 'name email role')
      .populate('affectedMilestones', 'title status order dueDate')
      .populate('relatedDeliverables', 'title status scopeReference');

    if (!changeRequest) {
      throw ApiError.notFound('Change request not found');
    }

    return changeRequest;
  }

  /**
   * Record decision on a change request
   */
  async recordDecision(changeRequestId, user, { decision, comment }) {
    const changeRequest = await ChangeRequest.findById(changeRequestId);
    if (!changeRequest) {
      throw ApiError.notFound('Change request not found');
    }

    const isApproved = decision === CHANGE_REQUEST_DECISION.APPROVE;
    const decisionRecord = {
      decision,
      comment: comment || '',
      decidedAt: new Date(),
    };

    if (user.role === 'freelancer') {
      changeRequest.freelancerDecision = decisionRecord;
    } else {
      changeRequest.clientDecision = decisionRecord;
    }

    changeRequest.status = isApproved
      ? CHANGE_REQUEST_STATUS.APPROVED
      : CHANGE_REQUEST_STATUS.REJECTED;

    await changeRequest.save();
    return changeRequest;
  }
}

module.exports = new ChangeRequestService();
