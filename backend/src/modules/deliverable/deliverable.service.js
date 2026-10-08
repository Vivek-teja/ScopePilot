const Deliverable = require('./deliverable.model');
const Milestone = require('../milestone/milestone.model');
const Project = require('../project/project.model');
const ApiError = require('../../utils/apiError');
const { DELIVERABLE_STATUS } = require('./deliverable.constants');

class DeliverableService {
  /**
   * Create a new deliverable and associate it with a milestone
   */
  async createDeliverable(userId, deliverableData) {
    const { project: projectId, milestone: milestoneId, title, description, scopeReference, status, acceptanceCriteria } = deliverableData;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      throw ApiError.notFound('Milestone not found');
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
  async getDeliverableById(deliverableId) {
    const deliverable = await Deliverable.findById(deliverableId)
      .populate('project', 'title status freelancer client')
      .populate('milestone', 'title status order');

    if (!deliverable) {
      throw ApiError.notFound('Deliverable not found');
    }

    return deliverable;
  }

  /**
   * Get all deliverables for a milestone
   */
  async getDeliverablesByMilestone(milestoneId) {
    return Deliverable.find({ milestone: milestoneId }).sort({ createdAt: 1 });
  }
}

module.exports = new DeliverableService();
