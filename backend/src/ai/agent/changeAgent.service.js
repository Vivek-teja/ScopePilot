/**
 * Change-Analysis Agent Service
 *
 * Implements Section 6 bounded agent workflow:
 * - Tool A: readApprovedScope(projectId)
 * - Tool B: compareRequestedWork(request, deliverables)
 * - Tool C: calculateScheduleImpact(effort, capacity)
 * - Records tool execution metrics (duration, status, errors)
 * - Prevents model hallucinations of price, effort, or deadlines
 * - Updates ChangeRequest document if changeRequestId is provided
 */

const Project = require('../../modules/project/project.model');
const { ProposalVersion } = require('../../modules/proposal/proposal.model');
const Deliverable = require('../../modules/deliverable/deliverable.model');
const ChangeRequest = require('../../modules/changeRequest/changeRequest.model');
const { defaultAtlasVectorSearchService } = require('../rag/atlasVectorSearch.service');
const { defaultProviderFactory } = require('../providers/providerFactory');
const { defaultEffortCalculator } = require('../tools/effortCalculator.tool');
const { ChangeAgentInputSchema, ChangeAgentOutputSchema } = require('../../contracts/changeAgent.contract');
const ApiError = require('../../utils/apiError');

class ChangeAgentService {
  constructor(options = {}) {
    this.vectorSearch = options.vectorSearch || defaultAtlasVectorSearchService;
    this.providerFactory = options.providerFactory || defaultProviderFactory;
    this.effortCalculator = options.effortCalculator || defaultEffortCalculator;
  }

  /**
   * Tool A: readApprovedScope(projectId)
   * Retrieves current approved proposal version and deliverables using backend models
   */
  async readApprovedScope(projectId) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound(`Project "${projectId}" not found`);
    }

    let approvedVersion = null;
    if (project.currentApprovedProposal) {
      approvedVersion = await ProposalVersion.findById(project.currentApprovedProposal);
    }
    if (!approvedVersion) {
      approvedVersion = await ProposalVersion.findOne({
        project: projectId,
        status: 'approved',
      }).sort({ versionNumber: -1 });
    }

    if (!approvedVersion) {
      throw ApiError.badRequest(
        `Project "${projectId}" has no approved proposal version. An approved baseline is required.`
      );
    }

    const deliverables = await Deliverable.find({ project: projectId }).lean();

    return {
      project,
      approvedVersion,
      proposalVersion: approvedVersion.versionNumber || approvedVersion.version,
      proposalTitle: approvedVersion.title,
      deliverables,
    };
  }

  /**
   * Tool B: compareRequestedWork(request, deliverables, approvedVersion, projectId)
   * Compares the new request against approved scope using retrieval and model reasoning
   */
  async compareRequestedWork(request, deliverables, approvedVersion, projectId) {
    const query = `${request.title} ${request.description || ''}`.trim();
    const searchRes = await this.vectorSearch.retrieveRelevantScope(projectId, query, {
      topK: 3,
      minThreshold: 0.35,
    });

    const retrievedPassages = searchRes.retrievedPassages || [];

    const { provider } = await this.providerFactory.getProvider();
    const comparison = await provider.generateComparison({
      newClientRequest: request,
      retrievedPassages,
      approvedProposalVersion: approvedVersion,
      deliverables,
    });

    return {
      comparison,
      retrievedPassages,
    };
  }

  /**
   * Tool C: calculateScheduleImpact(effortParams)
   * Deterministically calculates schedule and budget impact without model guessing
   */
  calculateScheduleImpact(effortParams) {
    return this.effortCalculator.calculate(effortParams);
  }

  /**
   * Run the bounded Change-Analysis Agent workflow
   */
  async runChangeAgent(input, user) {
    const validatedInput = ChangeAgentInputSchema.parse(input);
    const {
      projectId,
      changeRequestId,
      requestTitle,
      requestDescription,
      requestedBy,
      developerCapacityHoursPerDay,
      storedHourlyRate,
    } = validatedInput;

    const toolLogs = [];
    const runStartTime = Date.now();

    // Validate changeRequestId if provided
    if (changeRequestId) {
      const cr = await ChangeRequest.findById(changeRequestId);
      if (!cr) {
        throw ApiError.notFound(`Change request "${changeRequestId}" not found`);
      }
    }

    // ── Tool A: readApprovedScope ─────────────────────────────────────────────
    let scopeData;
    const toolAStart = Date.now();
    try {
      scopeData = await this.readApprovedScope(projectId);
      toolLogs.push({
        toolName: 'readApprovedScope',
        status: 'success',
        durationMs: Date.now() - toolAStart,
      });
    } catch (err) {
      toolLogs.push({
        toolName: 'readApprovedScope',
        status: 'failed',
        durationMs: Date.now() - toolAStart,
        error: err.message,
      });
      throw err;
    }

    const { project, approvedVersion, deliverables } = scopeData;

    // Authorization check
    if (user) {
      const userId = user._id ? user._id.toString() : user.id;
      const freelancerId = project.freelancer?._id ? project.freelancer._id.toString() : project.freelancer?.toString();
      const clientId = project.client?._id ? project.client._id.toString() : project.client?.toString();
      const isFreelancer = freelancerId === userId;
      const isClient = clientId === userId;
      const isAdmin = user.role === 'admin';

      if (!isFreelancer && !isClient && !isAdmin) {
        throw ApiError.forbidden('Forbidden. You do not have permission to run change agent for this project.');
      }
    }

    // ── Tool B: compareRequestedWork ──────────────────────────────────────────
    let comparisonData;
    const toolBStart = Date.now();
    const requestObj = {
      title: requestTitle,
      description: requestDescription,
      requestedBy: requestedBy || (user ? user.name : 'client'),
    };

    try {
      comparisonData = await this.compareRequestedWork(
        requestObj,
        deliverables,
        approvedVersion,
        projectId
      );
      toolLogs.push({
        toolName: 'compareRequestedWork',
        status: 'success',
        durationMs: Date.now() - toolBStart,
      });
    } catch (err) {
      toolLogs.push({
        toolName: 'compareRequestedWork',
        status: 'failed',
        durationMs: Date.now() - toolBStart,
        error: err.message,
      });
      throw err;
    }

    const { comparison, retrievedPassages } = comparisonData;

    // ── Tool C: calculateScheduleImpact ───────────────────────────────────────
    let scheduleImpact;
    const toolCStart = Date.now();
    try {
      scheduleImpact = this.calculateScheduleImpact({
        reviewStatus: comparison.reviewStatus,
        outOfScopeItemsCount: (comparison.outOfScopeItems || []).length,
        affectedDeliverablesCount: (comparison.affectedDeliverables || []).length,
        storedHourlyRate,
      });

      // Adjust schedule days using capacity if different from 6
      if (scheduleImpact.estimatedHours !== null && developerCapacityHoursPerDay !== 6) {
        scheduleImpact.scheduleImpactDays = Math.ceil(
          scheduleImpact.estimatedHours / developerCapacityHoursPerDay
        );
      }

      toolLogs.push({
        toolName: 'calculateScheduleImpact',
        status: 'success',
        durationMs: Date.now() - toolCStart,
      });
    } catch (err) {
      toolLogs.push({
        toolName: 'calculateScheduleImpact',
        status: 'failed',
        durationMs: Date.now() - toolCStart,
        error: err.message,
      });
      throw err;
    }

    // ── Link to Change Request Document if changeRequestId provided ──────────
    if (changeRequestId) {
      try {
        await ChangeRequest.findByIdAndUpdate(changeRequestId, {
          aiAnalysis: {
            summary: comparison.summary,
            confidenceScore: comparison.confidenceScore,
            rawOutput: comparison,
            analyzedAt: new Date(),
          },
          scopeComparison: {
            inScopeItems: (comparison.inScopeItems || []).map((i) => i.item),
            outOfScopeItems: (comparison.outOfScopeItems || []).map((i) => i.item),
            similarityScore: retrievedPassages[0] ? retrievedPassages[0].similarityScore : 0,
          },
          retrievedScopeReferences: retrievedPassages.map((p) => p.sourceReference),
        });
      } catch {
        // Non-blocking write failure
      }
    }

    // ── Output Assembly & Validation ──────────────────────────────────────────
    const agentRunId = `agent_run_${runStartTime}_${Math.random().toString(36).substring(2, 7)}`;
    const output = {
      agentRunId,
      projectId: projectId.toString(),
      proposalVersionNumber: approvedVersion.versionNumber,
      reviewStatus: comparison.reviewStatus,
      confidenceScore: comparison.confidenceScore,
      summary: comparison.summary,
      evidence: retrievedPassages,
      inScopeItems: comparison.inScopeItems || [],
      outOfScopeItems: comparison.outOfScopeItems || [],
      uncertainItems: comparison.uncertainItems || [],
      affectedDeliverables: comparison.affectedDeliverables || [],
      scheduleImpact: {
        estimatedHours: scheduleImpact.estimatedHours,
        scheduleImpactDays: scheduleImpact.scheduleImpactDays,
        estimatedCost: scheduleImpact.estimatedCost,
        calculationBasis: scheduleImpact.calculationBasis,
        isEligibleForBilling: scheduleImpact.isEligibleForBilling,
      },
      humanReviewDraftNotice:
        'ADVISORY DRAFT ONLY: The Change-Analysis Agent possesses zero authority to approve or reject change requests. Final contractual decisions remain strictly with authorized human participants.',
      toolLogs,
      completedAt: new Date().toISOString(),
    };

    return ChangeAgentOutputSchema.parse(output);
  }
}

const defaultChangeAgentService = new ChangeAgentService();

module.exports = {
  ChangeAgentService,
  defaultChangeAgentService,
};
