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
const checkDecisionAccess = async (project, userId, user = null, proposal = null, version = null) => {
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

  // Version author cannot approve or reject their own revision (self-approval forbidden)
  if (version && version.createdBy) {
    const versionCreatorId = version.createdBy?._id || version.createdBy;
    if (versionCreatorId && versionCreatorId.toString() === userId.toString()) {
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
      createdBy: userId,
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

    if (!proposal.project) {
      throw ApiError.notFound('Associated project not found');
    }

    if (userId) {
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
   * Create a new proposal version (v2+)
   */
  async createProposalVersion(proposalId, userId, versionData, user = null) {
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      throw ApiError.notFound('Proposal not found');
    }

    const projectId = proposal.project?._id || proposal.project;
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Tenancy & creator role authorization
    const canCreate = await checkCreationAccess(project, userId, user);
    if (!canCreate) {
      throw ApiError.forbidden('You are not authorized to create a proposal version for this project');
    }

    // Rule 1: A new version cannot be created while the active version is pending_approval
    const activeVersion = await ProposalVersion.findById(proposal.activeVersion);
    if (activeVersion && activeVersion.status === PROPOSAL_STATUS.PENDING_APPROVAL) {
      throw ApiError.conflict('Cannot create a new proposal version while the current version is pending approval.');
    }

    // Determine next sequential version number
    const latestVersion = await ProposalVersion.findOne({ proposal: proposal._id }).sort({ versionNumber: -1 });
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : (proposal.currentVersionNumber || 0) + 1;

    const { title, scopeSummary, scopeItems, totalBudget, currency } = versionData;

    let newVersion;
    try {
      newVersion = await ProposalVersion.create({
        proposal: proposal._id,
        project: projectId,
        versionNumber: nextVersionNumber,
        title: title || proposal.title,
        scopeSummary,
        scopeItems: scopeItems || [],
        totalBudget,
        currency: currency || 'USD',
        status: PROPOSAL_STATUS.PENDING_APPROVAL,
        createdBy: userId,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw ApiError.conflict('Duplicate proposal version detected. A version with this number already exists.');
      }
      throw err;
    }

    // Atomically claim the revision on the parent Proposal:
    // Only succeeds if proposal is not already pending approval and version pointer matches what was read
    try {
      const updatedProposal = await Proposal.findOneAndUpdate(
        {
          _id: proposal._id,
          activeVersion: proposal.activeVersion,
          currentVersionNumber: proposal.currentVersionNumber,
          status: { $ne: PROPOSAL_STATUS.PENDING_APPROVAL },
        },
        {
          $set: {
            currentVersionNumber: nextVersionNumber,
            activeVersion: newVersion._id,
            status: PROPOSAL_STATUS.PENDING_APPROVAL,
          },
        },
        { new: true }
      );

      if (!updatedProposal) {
        // Safe cleanup: safe because updatedProposal is null, so no request references newVersion._id
        await ProposalVersion.deleteOne({ _id: newVersion._id, proposal: proposal._id }).catch(() => {});
        throw ApiError.conflict('Cannot create a new proposal version while the current version is pending approval.');
      }

      return {
        proposal: updatedProposal,
        version: newVersion,
      };
    } catch (err) {
      // If error occurred during parent update, clean up unlinked version
      if (newVersion && newVersion._id) {
        await ProposalVersion.deleteOne({ _id: newVersion._id, proposal: proposal._id }).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Get a specific proposal version by version number
   */
  async getProposalVersionByNumber(proposalId, versionNumber, userId = null, user = null) {
    const proposal = await Proposal.findById(proposalId)
      .populate('project', 'title status freelancer client workspace')
      .populate('createdBy', 'name email role');

    if (!proposal) {
      throw ApiError.notFound('Proposal not found');
    }

    if (!proposal.project) {
      throw ApiError.notFound('Associated project not found');
    }

    if (userId) {
      const hasAccess = await checkProjectAccess(proposal.project, userId, user);
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this project');
      }
    }

    const version = await ProposalVersion.findOne({
      proposal: proposalId,
      versionNumber,
    })
      .populate('createdBy', 'name email')
      .populate('decidedBy', 'name email');

    if (!version) {
      throw ApiError.notFound(`Proposal version ${versionNumber} not found`);
    }

    return {
      proposal,
      version,
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

    const activeVersion = await ProposalVersion.findById(proposal.activeVersion);
    if (!activeVersion) {
      throw ApiError.notFound('Active proposal version not found');
    }

    const canReview = await checkDecisionAccess(project, userId, userObj, proposal, activeVersion);
    if (!canReview) {
      throw ApiError.forbidden('You are not authorized to record a decision on this proposal');
    }

    // Terminal status checks
    if (activeVersion.status === PROPOSAL_STATUS.APPROVED || activeVersion.status === PROPOSAL_STATUS.SUPERSEDED) {
      throw ApiError.conflict('This proposal version is already approved and locked.');
    }

    if (activeVersion.status === PROPOSAL_STATUS.REJECTED) {
      throw ApiError.conflict('This proposal version has already been rejected and cannot be modified. A new revision must be created.');
    }

    if (activeVersion.status !== PROPOSAL_STATUS.PENDING_APPROVAL) {
      throw ApiError.conflict(`Cannot record decision on proposal version with status "${activeVersion.status}".`);
    }

    const isApproved = decision === PROPOSAL_DECISION.APPROVE;
    const newStatus = isApproved ? PROPOSAL_STATUS.APPROVED : PROPOSAL_STATUS.REJECTED;

    // Atomic conditional status transition: succeeds ONLY if status is still pending_approval
    const decidedVersion = await ProposalVersion.findOneAndUpdate(
      {
        _id: activeVersion._id,
        status: PROPOSAL_STATUS.PENDING_APPROVAL,
      },
      {
        $set: {
          status: newStatus,
          decidedBy: userId,
          decidedAt: new Date(),
          decisionComment: comment || '',
        },
      },
      { new: true }
    );

    if (!decidedVersion) {
      throw ApiError.conflict('Proposal version has already been decided or is no longer pending approval.');
    }

    const projectId = project._id || project;

    if (isApproved) {
      // Coordinated write order:
      // 1. Update Project baseline to newly approved version
      // 2. Mark previously approved version(s) superseded
      // 3. Update parent proposal status to APPROVED
      await Project.findByIdAndUpdate(projectId, {
        currentApprovedProposal: decidedVersion._id,
      });

      await ProposalVersion.updateMany(
        {
          proposal: proposal._id,
          _id: { $ne: decidedVersion._id },
          status: PROPOSAL_STATUS.APPROVED,
        },
        { status: PROPOSAL_STATUS.SUPERSEDED }
      );

      proposal.status = PROPOSAL_STATUS.APPROVED;
      await proposal.save();

      // Asynchronously auto-ingest approved scope into vector store for Scope Chat & AI analysis
      try {
        const { defaultIngestionService } = require('../../ai/rag/ingestion.service');
        defaultIngestionService.ingestApprovedScope(projectId, project.workspace).catch((ingestErr) => {
          // Non-blocking for proposal approval flow
        });
      } catch {
        // Non-blocking
      }
    } else {
      // Rule 4: If v2 is rejected after v1 was approved, preserve v1 as approved,
      // preserve project.currentApprovedProposal pointing to v1, and keep parent proposal status approved.
      const previouslyApprovedVersion = await ProposalVersion.findOne({
        proposal: proposal._id,
        _id: { $ne: decidedVersion._id },
        status: PROPOSAL_STATUS.APPROVED,
      });

      if (previouslyApprovedVersion) {
        proposal.status = PROPOSAL_STATUS.APPROVED;
      } else {
        proposal.status = PROPOSAL_STATUS.REJECTED;
      }
      await proposal.save();
    }

    return {
      proposal,
      decidedVersion,
    };
  }

  /**
   * List proposals for a project with tenancy verification
   */
  async listProposals(userId, query = {}, user = null) {
    const projectId = query.projectId || query.project;
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const hasAccess = await checkProjectAccess(project, userId, user);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const proposals = await Proposal.find({ project: projectId })
      .populate('activeVersion')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    const results = await Promise.all(
      proposals.map(async (proposal) => {
        const versions = await ProposalVersion.find({ proposal: proposal._id })
          .sort({ versionNumber: -1 })
          .populate('decidedBy', 'name email');
        return {
          ...proposal.toObject(),
          versions,
        };
      })
    );

    return results;
  }
}

const serviceInstance = new ProposalService();
serviceInstance.checkProjectAccess = checkProjectAccess;
serviceInstance.checkCreationAccess = checkCreationAccess;
serviceInstance.checkDecisionAccess = checkDecisionAccess;

module.exports = serviceInstance;
