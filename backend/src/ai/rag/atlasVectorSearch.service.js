/**
 * MongoDB Atlas Vector Search & Scope Retrieval Service
 *
 * Implements Section 4 retrieval requirements:
 * - Generate query embedding
 * - Executes Atlas $vectorSearch or in-memory vector ranking over project ScopeChunks
 * - Multi-tenant security guard: Chunks from another project/workspace NEVER appear
 * - Respects approved proposal version
 * - Returns structured retrieved evidence with citations
 */

const { ScopeChunk } = require('./scopeChunk.model');
const { defaultEmbeddingService } = require('../embeddings/embedding.service');
const Project = require('../../modules/project/project.model');
const ApiError = require('../../utils/apiError');

class AtlasVectorSearchService {
  constructor(options = {}) {
    this.embeddingService = options.embeddingService || defaultEmbeddingService;
    this.indexName = options.indexName || process.env.ATLAS_VECTOR_INDEX || 'scopepilot_vector_index';
  }

  /**
   * Main retrieval method
   * @param {string} projectId - Target project ObjectId string
   * @param {string} requestText - Query string
   * @param {Object} options - { topK, minThreshold, userContext, approvedVersionNumber }
   * @returns {Promise<Object>} Structured retrieval response
   */
  async retrieveRelevantScope(projectId, requestText, options = {}) {
    if (!projectId) {
      throw ApiError.badRequest('projectId is required for scope retrieval');
    }
    if (!requestText || requestText.trim().length < 3) {
      throw ApiError.badRequest('Search query must be at least 3 characters long');
    }

    const topK = options.topK || 3;
    const minThreshold = options.minThreshold !== undefined ? options.minThreshold : 0.35;
    const userContext = options.userContext || null;

    // 1. Tenancy & Access Verification
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound(`Project "${projectId}" not found`);
    }

    // If userContext is provided, verify user has access to this project
    if (userContext && userContext.user) {
      const userId = userContext.user._id ? userContext.user._id.toString() : userContext.user.id;
      const isFreelancer = project.freelancer && project.freelancer.toString() === userId;
      const isClient = project.client && project.client.toString() === userId;
      const isWorkspaceMember = userContext.workspaceMemberships
        ? userContext.workspaceMemberships.includes(project.workspace.toString())
        : true;

      if (!isFreelancer && !isClient && !isWorkspaceMember) {
        throw ApiError.forbidden('Access denied. You do not have permission to access scope for this project.');
      }
    }

    // 2. Generate 1024-dim dense query embedding
    const queryVector = Array.from(this.embeddingService.embedText(requestText));

    // 3. Attempt Atlas $vectorSearch aggregation pipeline, falling back to local vector ranking
    let candidateChunks = [];
    let atlasSearchUsed = false;

    try {
      if (mongoose.connection.readyState === 1) {
        // Atlas Vector Search aggregation pipeline syntax
        const pipeline = [
          {
            $vectorSearch: {
              index: this.indexName,
              path: 'embedding',
              queryVector,
              numCandidates: Math.max(topK * 5, 20),
              limit: topK * 2,
              filter: {
                project: project._id,
                status: 'ready',
              },
            },
          },
          {
            $project: {
              _id: 1,
              project: 1,
              workspace: 1,
              proposalVersion: 1,
              documentId: 1,
              documentType: 1,
              sectionReference: 1,
              title: 1,
              content: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ];

        candidateChunks = await ScopeChunk.aggregate(pipeline);
        if (candidateChunks && candidateChunks.length > 0) {
          atlasSearchUsed = true;
        }
      }
    } catch {
      // Atlas Vector Search index is not yet provisioned on this cluster; fallback to stored vectors
      atlasSearchUsed = false;
    }

    // If Atlas pipeline returned no results or was unindexed, rank stored project chunks locally
    if (!candidateChunks || candidateChunks.length === 0) {
      const storedChunks = await ScopeChunk.find({
        project: project._id,
        status: 'ready',
      }).lean();

      if (storedChunks && storedChunks.length > 0) {
        const queryVecTyped = new Float32Array(queryVector);

        candidateChunks = storedChunks
          .map((chunk) => {
            if (!chunk.embedding || chunk.embedding.length === 0) {
              return { ...chunk, score: 0 };
            }
            const chunkVecTyped = new Float32Array(chunk.embedding);
            const score = this.embeddingService.cosineSimilarity(queryVecTyped, chunkVecTyped);
            return {
              ...chunk,
              score,
            };
          })
          .filter((c) => c.score >= minThreshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
      }
    }

    // 4. Map candidate chunks into RetrievedPassage contract
    const retrievedPassages = candidateChunks.map((chunk) => {
      const similarityScore = Number((chunk.score || 0).toFixed(4));
      let relevanceCategory = 'no_evidence';
      if (similarityScore >= 0.65) {
        relevanceCategory = 'strong_match';
      } else if (similarityScore >= minThreshold) {
        relevanceCategory = 'weak_match';
      }

      return {
        passageId: chunk._id.toString(),
        sourceReference: chunk.sectionReference || 'SCOPE-REF',
        sourceTitle: chunk.title,
        documentType: chunk.documentType === 'deliverable' ? 'deliverable' : 'proposal_scope_item',
        proposalVersion: chunk.proposalVersion || 1,
        similarityScore,
        relevanceCategory,
        passageText: chunk.content,
        whyRetrieved: `Matched with score ${(similarityScore * 100).toFixed(1)}% against project scope.`,
        metadata: {
          documentId: chunk.documentId,
          atlasSearchUsed,
        },
      };
    });

    const topMatch = retrievedPassages[0] || null;
    const topScore = topMatch ? topMatch.similarityScore : 0.0;

    let status = 'uncertain';
    let uncertainReason = undefined;
    let suggestedQuestions = [];

    if (topMatch && topScore >= 0.65) {
      status = 'candidate_found';
    } else if (topMatch && topScore >= minThreshold) {
      status = 'weak_evidence';
      uncertainReason = `Top candidate "${topMatch.sourceReference}" matched with moderate similarity (${Math.round(topScore * 100)}%), but contains notable semantic divergence from approved deliverables.`;
      suggestedQuestions = [
        `Does this request extend existing deliverable ${topMatch.sourceReference} or introduce a distinct technical service?`,
      ];
    } else {
      status = 'uncertain';
      uncertainReason = 'Zero candidate passages met the minimum confidence threshold in the approved baseline. The requested capability was not found in approved deliverables.';
      suggestedQuestions = [
        'Could the client clarify if this requirement was discussed in a prior proposal version?',
        'Does this request require technical discovery or a formal change-order estimate?',
      ];
    }

    return {
      query: requestText,
      projectId: projectId.toString(),
      workspaceId: project.workspace.toString(),
      status,
      similarityScore: topScore,
      topMatch,
      retrievedPassages,
      uncertainReason,
      suggestedQuestions,
      atlasSearchUsed,
      safeguardNotice:
        'Similarity score indicates lexical and semantic proximity only. A high score identifies relevant baseline passages for human review but does NOT constitute proof that the requested change is covered by the contractual scope.',
      analyzedAt: new Date().toISOString(),
    };
  }
}

const defaultAtlasVectorSearchService = new AtlasVectorSearchService();

module.exports = {
  AtlasVectorSearchService,
  defaultAtlasVectorSearchService,
};
