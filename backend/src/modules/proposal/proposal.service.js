const { Proposal, ProposalVersion } = require('./proposal.model');
const Project = require('../project/project.model');
const ApiError = require('../../utils/apiError');
const { PROPOSAL_STATUS, PROPOSAL_DECISION } = require('./proposal.constants');

class ProposalService {
  /**
   * Create a new proposal with version 1
   */
  async createProposal(userId, proposalData) {
    const { project: projectId, title, scopeSummary, scopeItems, totalBudget, currency } = proposalData;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const proposal = await Proposal.create({
      project: projectId,
      title,
      currentVersionNumber: 1,
      status: PROPOSAL_STATUS.PENDING_APPROVAL,
      createdBy: userId,
    });

    const initialVersion = await ProposalVersion.create({
      proposal: proposal._id,
      project: projectId,
      versionNumber: 1,
      title,
      scopeSummary,
      scopeItems: scopeItems || [],
      totalBudget,
      currency: currency || 'USD',
      status: PROPOSAL_STATUS.PENDING_APPROVAL,
    });

    proposal.activeVersion = initialVersion._id;
    await proposal.save();

    return {
      proposal,
      version: initialVersion,
    };
  }

  /**
   * Get proposal by ID along with its versions
   */
  async getProposalById(proposalId) {
    const proposal = await Proposal.findById(proposalId)
      .populate('project', 'title status freelancer client')
      .populate('activeVersion')
      .populate('createdBy', 'name email role');

    if (!proposal) {
      throw ApiError.notFound('Proposal not found');
    }

    const versions = await ProposalVersion.find({ proposal: proposalId })
      .sort({ versionNumber: -1 })
      .populate('decidedBy', 'name email');

    return {
      proposal,
      versions,
    };
  }

  /**
   * Record decision (approve or reject) on a proposal version
   */
  async recordDecision(proposalId, userId, { decision, comment }) {
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      throw ApiError.notFound('Proposal not found');
    }

    const activeVersion = await ProposalVersion.findById(proposal.activeVersion);
    if (!activeVersion) {
      throw ApiError.notFound('Active proposal version not found');
    }

    if (activeVersion.status === PROPOSAL_STATUS.APPROVED) {
      throw ApiError.conflict('This proposal version is already approved and locked.');
    }

    const isApproved = decision === PROPOSAL_DECISION.APPROVE;
    const newStatus = isApproved ? PROPOSAL_STATUS.APPROVED : PROPOSAL_STATUS.REJECTED;

    activeVersion.status = newStatus;
    activeVersion.decidedBy = userId;
    activeVersion.decidedAt = new Date();
    activeVersion.decisionComment = comment || '';
    await activeVersion.save();

    proposal.status = newStatus;
    await proposal.save();

    // If approved, link proposal version into project as current approved proposal
    if (isApproved) {
      await Project.findByIdAndUpdate(proposal.project, {
        currentApprovedProposal: activeVersion._id,
      });
    }

    return {
      proposal,
      decidedVersion: activeVersion,
    };
  }
}

module.exports = new ProposalService();
