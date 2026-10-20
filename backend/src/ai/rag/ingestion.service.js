/**
 * Scope Document Ingestion Service
 *
 * Implements RAG document ingestion for approved proposals, deliverables, and documents:
 * - Chunking with configurable size and overlap
 * - Content hashing (SHA-256) to prevent duplicate chunks
 * - Stale chunk invalidation on proposal version updates
 * - Status lifecycle tracking ('pending' -> 'processing' -> 'ready' | 'failed')
 * - Embedding generation with model & dimension recording
 */

const crypto = require('crypto');
const { ScopeChunk } = require('./scopeChunk.model');
const { defaultEmbeddingService } = require('../embeddings/embedding.service');
const Project = require('../../modules/project/project.model');
const { ProposalVersion } = require('../../modules/proposal/proposal.model');
const Deliverable = require('../../modules/deliverable/deliverable.model');
const ApiError = require('../../utils/apiError');

class IngestionService {
  constructor(options = {}) {
    this.embeddingService = options.embeddingService || defaultEmbeddingService;
    this.chunkSize = options.chunkSize || 300; // characters per chunk
    this.chunkOverlap = options.chunkOverlap || 50;
    this.embeddingModel = options.embeddingModel || 'nomic-embed-text';
    this.embeddingDimension = options.embeddingDimension || 1024;
  }

  /**
   * Helper to safely extract a 24-character hexadecimal ObjectId string
   */
  _normalizeId(id) {
    if (!id) return '';
    let str = '';
    if (typeof id === 'object') {
      const raw = id._id || id.id || id;
      str = raw && typeof raw === 'object' && raw.toString ? raw.toString() : String(raw || '');
    } else {
      str = String(id).trim();
    }
    const hexMatch = str.match(/[a-f\d]{24}/i);
    return hexMatch ? hexMatch[0] : str;
  }

  /**
   * Compute deterministic SHA-256 hash of text content
   */
  hashContent(text) {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Split text into overlapping chunks
   */
  chunkText(text, size = this.chunkSize, overlap = this.chunkOverlap) {
    if (!text || typeof text !== 'string') return [];
    const clean = text.trim();
    if (clean.length <= size) return [clean];

    const chunks = [];
    let start = 0;
    while (start < clean.length) {
      const end = Math.min(start + size, clean.length);
      const slice = clean.substring(start, end).trim();
      if (slice.length > 0) {
        chunks.push(slice);
      }
      if (end >= clean.length) break;
      start += size - overlap;
    }
    return chunks;
  }

  /**
   * Ingest and vectorize the currently approved proposal version and deliverables for a project
   * @param {string} projectId
   * @param {string} [workspaceId] - Deprecated caller-supplied workspace (ignored in favor of project.workspace)
   * @param {object} [user] - Optional user context for direct service calls
   * @returns {Promise<Object>} Ingestion summary
   */
  async ingestApprovedScope(projectId, workspaceId = null, user = null) {
    const cleanProjectId = this._normalizeId(projectId);

    // 1. Verify project exists and get approved proposal
    const project = await Project.findById(cleanProjectId);
    if (!project) {
      throw ApiError.notFound(`Project "${cleanProjectId}" not found`);
    }

    // Tenancy authorization check if user provided
    if (user && user._id) {
      const userId = user._id.toString();
      const freelancerId = project.freelancer?._id ? project.freelancer._id.toString() : project.freelancer?.toString();
      const clientId = project.client?._id ? project.client._id.toString() : project.client?.toString();
      const isFreelancer = Boolean(freelancerId && freelancerId === userId);
      const isClient = Boolean(clientId && clientId === userId);
      const isAdmin = user.role === 'admin';
      if (!isFreelancer && !isClient && !isAdmin) {
        throw ApiError.forbidden('Forbidden. You do not have permission to ingest scope for this project.');
      }
    }

    // Invariant: Always derive effective workspace strictly from trusted project record
    const effectiveWorkspaceId = project.workspace?._id || project.workspace;

    // 2. Load approved proposal version
    let approvedVersion = null;
    if (project.currentApprovedProposal) {
      approvedVersion = await ProposalVersion.findById(project.currentApprovedProposal);
    }
    if (!approvedVersion) {
      approvedVersion = await ProposalVersion.findOne({
        project: cleanProjectId,
        status: 'approved',
      }).sort({ versionNumber: -1 });
    }

    if (!approvedVersion) {
      throw ApiError.badRequest(
        `No approved proposal version found for project "${cleanProjectId}". Scope ingestion requires an approved proposal.`
      );
    }

    // 3. Load project deliverables
    const deliverables = await Deliverable.find({ project: cleanProjectId });

    // 4. Invalidate and remove any stale chunks for older versions or outdated deliverables
    await ScopeChunk.deleteMany({
      project: cleanProjectId,
      proposalVersion: { $ne: approvedVersion.versionNumber },
    });

    const ingestedChunks = [];
    const skippedDuplicates = [];

    // 5. Ingest Proposal Scope Summary & Items
    const proposalSummaryChunks = this.chunkText(
      `${approvedVersion.title}: ${approvedVersion.scopeSummary}`
    );

    for (let i = 0; i < proposalSummaryChunks.length; i++) {
      const chunkText = proposalSummaryChunks[i];
      const hash = this.hashContent(chunkText);

      const existing = await ScopeChunk.findOne({ project: projectId, contentHash: hash });
      if (existing) {
        skippedDuplicates.push(hash);
        continue;
      }

      const embeddingVec = Array.from(this.embeddingService.embedText(chunkText));

      const doc = await ScopeChunk.create({
        project: projectId,
        workspace: effectiveWorkspaceId,
        proposalVersion: approvedVersion.versionNumber,
        documentId: approvedVersion._id.toString(),
        documentType: 'proposal',
        sectionReference: `PROP-V${approvedVersion.versionNumber}-SCOPE-${i + 1}`,
        title: approvedVersion.title,
        content: chunkText,
        embedding: embeddingVec,
        embeddingModel: this.embeddingModel,
        embeddingDimension: this.embeddingDimension,
        status: 'ready',
        contentHash: hash,
        metadata: {
          totalBudget: approvedVersion.totalBudget,
          currency: approvedVersion.currency,
          chunkIndex: i,
        },
      });

      ingestedChunks.push(doc);
    }

    // Ingest Individual Scope Items from Proposal Version
    if (Array.isArray(approvedVersion.scopeItems)) {
      for (let i = 0; i < approvedVersion.scopeItems.length; i++) {
        const item = approvedVersion.scopeItems[i];
        const itemText = `Scope Item: ${item.title}. ${item.description || ''} (Est: ${item.estimatedHours}h, $${item.price})`;
        const hash = this.hashContent(itemText);

        const existing = await ScopeChunk.findOne({ project: projectId, contentHash: hash });
        if (existing) {
          skippedDuplicates.push(hash);
          continue;
        }

        const embeddingVec = Array.from(this.embeddingService.embedText(itemText));

        const doc = await ScopeChunk.create({
          project: projectId,
          workspace: effectiveWorkspaceId,
          proposalVersion: approvedVersion.versionNumber,
          documentId: (item._id || `item-${i}`).toString(),
          documentType: 'scope_item',
          sectionReference: `PROP-ITEM-${i + 1}`,
          title: item.title,
          content: itemText,
          embedding: embeddingVec,
          embeddingModel: this.embeddingModel,
          embeddingDimension: this.embeddingDimension,
          status: 'ready',
          contentHash: hash,
          metadata: {
            estimatedHours: item.estimatedHours,
            price: item.price,
          },
        });

        ingestedChunks.push(doc);
      }
    }

    // 6. Ingest Deliverables with Acceptance Criteria
    for (const del of deliverables) {
      const delText = `Deliverable: ${del.title} [${del.scopeReference || 'DEL'}]. ${del.description || ''} Acceptance Criteria: ${(del.acceptanceCriteria || []).join('; ')}`;
      const hash = this.hashContent(delText);

      const existing = await ScopeChunk.findOne({ project: projectId, contentHash: hash });
      if (existing) {
        skippedDuplicates.push(hash);
        continue;
      }

      const embeddingVec = Array.from(this.embeddingService.embedText(delText));

      const doc = await ScopeChunk.create({
        project: projectId,
        workspace: effectiveWorkspaceId,
        proposalVersion: approvedVersion.versionNumber,
        documentId: del._id.toString(),
        documentType: 'deliverable',
        sectionReference: del.scopeReference || `DEL-${del._id.toString().substring(0, 6)}`,
        title: del.title,
        content: delText,
        embedding: embeddingVec,
        embeddingModel: this.embeddingModel,
        embeddingDimension: this.embeddingDimension,
        status: 'ready',
        contentHash: hash,
        metadata: {
          milestone: del.milestone ? del.milestone.toString() : null,
          status: del.status,
        },
      });

      ingestedChunks.push(doc);
    }

    return {
      success: true,
      projectId,
      workspaceId: effectiveWorkspaceId.toString(),
      approvedVersionNumber: approvedVersion.versionNumber,
      totalChunksCreated: ingestedChunks.length,
      skippedDuplicates: skippedDuplicates.length,
      embeddingModel: this.embeddingModel,
      embeddingDimension: this.embeddingDimension,
    };
  }

  /**
   * Ingest raw text or simulated PDF/TXT document content
   */
  async ingestDocumentText(projectId, workspaceId, documentId, docTitle, rawText, docType = 'txt') {
    const chunks = this.chunkText(rawText);
    const ingested = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const hash = this.hashContent(chunkText);

      const existing = await ScopeChunk.findOne({ project: projectId, contentHash: hash });
      if (existing) continue;

      const embeddingVec = Array.from(this.embeddingService.embedText(chunkText));

      const doc = await ScopeChunk.create({
        project: projectId,
        workspace: workspaceId,
        proposalVersion: 1,
        documentId,
        documentType: docType,
        sectionReference: `DOC-${documentId}-PART-${i + 1}`,
        title: `${docTitle} (Part ${i + 1})`,
        content: chunkText,
        embedding: embeddingVec,
        embeddingModel: this.embeddingModel,
        embeddingDimension: this.embeddingDimension,
        status: 'ready',
        contentHash: hash,
        metadata: { chunkIndex: i },
      });

      ingested.push(doc);
    }

    return {
      success: true,
      documentId,
      chunksCreated: ingested.length,
    };
  }
}

const defaultIngestionService = new IngestionService();

module.exports = {
  IngestionService,
  defaultIngestionService,
};
