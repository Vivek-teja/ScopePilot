const Milestone = require('./milestone.model');
const Project = require('../project/project.model');
const ApiError = require('../../utils/apiError');
const { MILESTONE_STATUS, MILESTONE_DECISION } = require('./milestone.constants');

class MilestoneService {
  /**
   * Create a new milestone for a project
   */
  async createMilestone(userId, milestoneData) {
    const { project: projectId, title, description, status, dueDate, order } = milestoneData;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
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
  async getMilestoneById(milestoneId) {
    const milestone = await Milestone.findById(milestoneId)
      .populate('project', 'title status freelancer client')
      .populate('deliverables')
      .populate('evidence.submittedBy', 'name email')
      .populate('decisions.decidedBy', 'name email');

    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    return milestone;
  }

  /**
   * Add evidence / progress proof to milestone
   */
  async addEvidence(milestoneId, userId, evidenceData) {
    const { comment, fileUrls } = evidenceData;

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
    }

    const newEvidence = {
      comment,
      fileUrls: fileUrls || [],
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
  async recordDecision(milestoneId, userId, { decision, comment }) {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
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
}

module.exports = new MilestoneService();
