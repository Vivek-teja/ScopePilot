/**
 * Database-Backed AI Scope Analysis Service
 *
 * Implements Section 3 requirements:
 * - Ingests real project ID and client request
 * - Loads approved ProposalVersion and Deliverables from MongoDB
 * - Retrieves relevant scope evidence
 * - Classifies into: in_scope, out_of_scope, partially_out_of_scope, needs_clarification, uncertain
 * - Returns validated structured output matching ChangeAnalysisOutputSchema
 * - Maps affected milestones from real database deliverables
 */

const Project = require('../../modules/project/project.model');
const { ProposalVersion } = require('../../modules/proposal/proposal.model');
const Deliverable = require('../../modules/deliverable/deliverable.model');
const Milestone = require('../../modules/milestone/milestone.model');
const { defaultAtlasVectorSearchService } = require('../rag/atlasVectorSearch.service');
const { defaultProviderFactory } = require('../providers/providerFactory');
const { defaultEffortCalculator } = require('../tools/effortCalculator.tool');
const { ChangeAnalysisOutputSchema } = require('../../contracts/aiAnalysis.contract');
const ApiError = require('../../utils/apiError');

class ScopeAnalysisDbService {
  constructor(options = {}) {
    this.vectorSearchService = options.vectorSearchService || defaultAtlasVectorSearchService;
    this.providerFactory = options.providerFactory || defaultProviderFactory;
    this.effortCalculator = options.effortCalculator || defaultEffortCalculator;
  }

  /**
   * Run real scope analysis from MongoDB project context
   * @param {Object} input - { projectId, newClientRequest, userContext }
   * @returns {Promise<Object>} Validated ChangeAnalysisOutput
   */
  async analyzeProjectScope(input) {
    const { projectId, newClientRequest, userContext } = input;

    if (!projectId) {
      throw ApiError.badRequest('projectId is required for database scope analysis');
    }
    if (!newClientRequest || !newClientRequest.title) {
      throw ApiError.badRequest('newClientRequest.title is required');
    }

    // 1. Fetch project with tenancy checks
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound(`Project "${projectId}" not found`);
    }

    // Tenancy authorization check if userContext provided
    if (userContext && userContext.user) {
      const userId = userContext.user._id ? userContext.user._id.toString() : userContext.user.id;
      const isFreelancer = project.freelancer && project.freelancer.toString() === userId;
      const isClient = project.client && project.client.toString() === userId;
      if (!isFreelancer && !isClient && userContext.user.role !== 'admin') {
        throw ApiError.forbidden('You do not have authorization to analyze scope for this project.');
      }
    }

    // 2. Load approved proposal version
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
        `Project "${projectId}" has no approved proposal version. An approved baseline is required for change analysis.`
      );
    }

    // 3. Load deliverables & milestones
    const deliverables = await Deliverable.find({ project: projectId }).lean();
    const milestones = await Milestone.find({ project: projectId }).lean();

    // 4. Retrieve scope evidence via vector search
    const query = `${newClientRequest.title} ${newClientRequest.description || ''}`.trim();
    const retrievalRes = await this.vectorSearchService.retrieveRelevantScope(projectId, query, {
      topK: 3,
      minThreshold: 0.35,
      userContext,
    });

    const retrievedPassages = retrievalRes.retrievedPassages || [];

    // 5. Grounded Model Comparison
    const { provider } = await this.providerFactory.getProvider();
    const comparison = await provider.generateComparison({
      newClientRequest,
      retrievedPassages,
      approvedProposalVersion: approvedVersion,
      deliverables,
    });

    // 6. Map affected deliverables to real milestone data from database
    const affectedDeliverables = (comparison.affectedDeliverables || []).map((ad) => {
      const dbDel = deliverables.find(
        (d) =>
          d.scopeReference === ad.scopeReference ||
          (d._id && d._id.toString() === ad.deliverableId)
      );
      return {
        deliverableId: (dbDel ? dbDel._id : ad.deliverableId).toString(),
        scopeReference: ad.scopeReference || (dbDel ? dbDel.scopeReference : 'DEL-REF'),
        title: ad.title || (dbDel ? dbDel.title : 'Deliverable'),
        impactDescription: ad.impactDescription || 'Scope altered by requested changes.',
      };
    });

    // Map affected milestones from affected deliverables
    const affectedMilestoneIds = new Set();
    for (const ad of affectedDeliverables) {
      const dbDel = deliverables.find((d) => d._id.toString() === ad.deliverableId);
      if (dbDel && dbDel.milestone) {
        affectedMilestoneIds.add(dbDel.milestone.toString());
      }
    }
    const affectedMilestonesList = milestones
      .filter((m) => affectedMilestoneIds.has(m._id.toString()))
      .map((m) => ({
        milestoneId: m._id.toString(),
        title: m.title,
        status: m.status,
      }));

    // 7. Calculate effort using deterministic tool
    const effortCalc = this.effortCalculator.calculate({
      reviewStatus: comparison.reviewStatus,
      outOfScopeItemsCount: (comparison.outOfScopeItems || []).length,
      affectedDeliverablesCount: affectedDeliverables.length,
      storedHourlyRate: 100,
    });

    // 8. Assemble evidence list with citations
    const evidenceList = retrievedPassages.map((p) => ({
      sourceReference: p.sourceReference,
      snippet: p.passageText,
      relevanceScore: p.similarityScore,
    }));

    // Recommendations
    const recommendations = [...(comparison.suggestedQuestions || [])];
    if (comparison.reviewStatus === 'in_scope') {
      recommendations.push('Refinement is approved within the baseline proposal budget. Proceed with implementation.');
    } else if (comparison.reviewStatus === 'out_of_scope') {
      recommendations.push(
        `Draft a formal change request. Estimated financial impact: $${effortCalc.estimatedCost} (${effortCalc.estimatedHours}h). Client decision required.`
      );
    } else if (comparison.reviewStatus === 'partially_out_of_scope') {
      recommendations.push(
        'Separate in-scope baseline work from unbudgeted batch/integration scope to minimize project schedule risk.'
      );
    } else {
      recommendations.push('Schedule technical discovery to clarify missing evidence before estimating.');
    }

    const output = {
      summary: comparison.summary,
      reviewStatus: comparison.reviewStatus,
      confidenceScore: comparison.confidenceScore,
      inScopeItems: comparison.inScopeItems || [],
      outOfScopeItems: comparison.outOfScopeItems || [],
      uncertainItems: comparison.uncertainItems || [],
      affectedDeliverables,
      evidence: evidenceList,
      recommendations,
      disclaimer:
        'AI analysis is an advisory draft only. Approval or rejection of changes must be finalized by authorized project participants. Cost and schedule adjustments require explicit deterministic calculation.',
      analyzedAt: new Date().toISOString(),
      // Additional rich context
      metadata: {
        projectId: projectId.toString(),
        proposalVersionNumber: approvedVersion.versionNumber,
        affectedMilestones: affectedMilestonesList,
        effortCalculation: effortCalc,
      },
    };

    return ChangeAnalysisOutputSchema.parse(output);
  }
}

const defaultScopeAnalysisDbService = new ScopeAnalysisDbService();

module.exports = {
  ScopeAnalysisDbService,
  defaultScopeAnalysisDbService,
};
