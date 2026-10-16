const { Proposal, ProposalVersion } = require('./proposal.model');
const Project = require('../project/project.model');
const Workspace = require('../workspace/workspace.model');
const ApiError = require('../../utils/apiError');
const { PROPOSAL_STATUS, PROPOSAL_DECISION } = require('./proposal.constants');

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
    const workspaceId = project.workspace?._id || project.workspace;
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
 * Helper to verify whether a user is authorized to create/formulate a proposal for a project.
 * Proposals are formulated by the assigned freelancer, workspace owners, workspace admins, or system admins.
 * Clients (and unauthorized outsiders) cannot create proposals.
 */
const checkCreationAccess = async (project, userId, user = null) => {
  if (!project || !userId) return false;

  // System admin can create proposals
  if (user && user.role === 'admin') return true;

  // The assigned client cannot formulate a proposal
  const clientId = project.client?._id || project.client;
  if (clientId && clientId.toString() === userId.toString()) {
    return false;
  }

  // The assigned freelancer is authorized to create proposals
  const freelancerId = project.freelancer?._id || project.freelancer;
  if (freelancerId && freelancerId.toString() === userId.toString()) {
    return true;
  }

  // Workspace owner or workspace admin can create proposals
  if (project.workspace) {
    const workspaceId = project.workspace?._id || project.workspace;
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

/**
 * Helper to verify whether a user is an authorized reviewer for proposal decisions.
 * Strictly forbids freelancer self-approval and any review decisions by freelancers or the proposal author.
 * Only designated project clients, workspace owners/admins, or system admins can record decisions.
 */
const checkDecisionAccess = async (project, userId, user = null, proposal = null) => {
  if (!project || !userId) return false;

  const freelancerId = project.freelancer?._id || project.freelancer;
  const clientId = project.client?._id || project.client;

  // Freelancer assigned to this project cannot approve or reject proposals (self-approval forbidden)
  if (freelancerId && freelancerId.toString() === userId.toString()) {
    return false;
  }

  // Any user with role 'freelancer' cannot record a proposal decision
  if (user && user.role === 'freelancer') {
    return false;
  }

  // Author cannot approve or reject their own proposal (self-approval forbidden)
  if (proposal && proposal.createdBy) {
    const creatorId = proposal.createdBy?._id || proposal.createdBy;
    if (creatorId && creatorId.toString() === userId.toString()) {
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
    const workspaceId = project.workspace?._id || project.workspace;
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

class ProposalService {
  /**
   * Create a new proposal with version 1
   */
  async createProposal(userId, proposalData, user = null) {
    const projectId = proposalData.project || proposalData.projectId;
    const { title, scopeSummary, scopeItems, totalBudget, currency } = proposalData;

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const canCreate = await checkCreationAccess(project, userId, user);
    if (!canCreate) {
      throw ApiError.forbidden('You are not authorized to create a proposal for this project');
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
  async getProposalById(proposalId, userId = null, user = null) {
    const proposal = await Proposal.findById(proposalId)
      .populate('project', 'title status freelancer client workspace')
      .populate('activeVersion')
      .populate('createdBy', 'name email role');

    if (!proposal) {
      throw ApiError.notFound('Proposal not found');
    }

    if (userId && proposal.project) {
      const hasAccess = await checkProjectAccess(proposal.project, userId, user);
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this project');
      }
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
  async recordDecision(proposalId, userIdOrUser, data, user = null) {
    const userObj = user || (userIdOrUser && userIdOrUser.role ? userIdOrUser : null);
    const userId = (userIdOrUser && userIdOrUser._id && userIdOrUser.role) ? userIdOrUser._id : (userIdOrUser?._id || userIdOrUser);

    const { decision, comment } = data || {};

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      throw ApiError.notFound('Proposal not found');
    }

    let project = proposal.project;
    if (!project || !project._id || !project.freelancer) {
      const projId = project?._id || project;
      project = await Project.findById(projId);
    }

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const canReview = await checkDecisionAccess(project, userId, userObj, proposal);
    if (!canReview) {
      throw ApiError.forbidden('You are not authorized to record a decision on this proposal');
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
      const projectId = proposal.project?._id || proposal.project;
      await Project.findByIdAndUpdate(projectId, {
        currentApprovedProposal: activeVersion._id,
      });
    }

    return {
      proposal,
      decidedVersion: activeVersion,
    };
  }
}

const serviceInstance = new ProposalService();
serviceInstance.checkProjectAccess = checkProjectAccess;
serviceInstance.checkCreationAccess = checkCreationAccess;
serviceInstance.checkDecisionAccess = checkDecisionAccess;

module.exports = serviceInstance;
