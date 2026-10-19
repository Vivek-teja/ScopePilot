const { defaultEmbeddingService } = require('../embeddings/embedding.service');
const { defaultCorpusService } = require('./corpus.service');
const {
  RELEVANCE_CATEGORY,
  RETRIEVAL_STATUS,
  RetrievalQueryInputSchema,
  RetrievalResultSchema,
} = require('../../contracts/retrieval.contract');

const STRONG_MATCH_THRESHOLD = 0.65;
const MODERATE_MATCH_THRESHOLD = 0.35;

const SAFEGUARD_NOTICE =
  'Similarity score indicates lexical and semantic proximity only. A high score identifies relevant baseline passages for human review but does NOT constitute proof that the requested change is covered by the contractual scope.';

class RetrievalService {
  /**
   * @param {object} options 
   */
  constructor(options = {}) {
    this.embeddingService = options.embeddingService || defaultEmbeddingService;
    this.corpusService = options.corpusService || defaultCorpusService;
    this.strongThreshold = options.strongThreshold || STRONG_MATCH_THRESHOLD;
    this.weakThreshold = options.weakThreshold || MODERATE_MATCH_THRESHOLD;

    // Cache passage embeddings for sub-millisecond retrieval
    this.passageEmbeddingCache = new Map();
    this.initializeCorpusIndex();
  }

  /**
   * Pre-computes and caches embedding vectors for the canonical corpus.
   */
  initializeCorpusIndex() {
    const passages = this.corpusService.getAllPassages();
    for (const passage of passages) {
      const vector = this.embeddingService.embedText(
        `${passage.sourceTitle}. ${passage.passageText}`
      );
      this.passageEmbeddingCache.set(passage.passageId, vector);
    }
  }

  /**
   * Performs semantic vector retrieval for a natural-language client query against approved scope passages.
   * 
   * @param {object} rawInput - Matching RetrievalQueryInputSchema
   * @param {Array<object>} [customPassages] - Optional custom scope passages
   * @returns {object} Matching RetrievalResultSchema
   */
  retrieve(rawInput, customPassages = null) {
    const input = RetrievalQueryInputSchema.parse(rawInput);
    const { query, topK, minThreshold } = input;

    const passagesToSearch = Array.isArray(customPassages) ? customPassages : this.corpusService.getAllPassages();
    const queryVector = this.embeddingService.embedText(query);
    const scoredPassages = [];

    for (const passage of passagesToSearch) {
      let passageVector = this.passageEmbeddingCache.get(passage.passageId);
      if (!passageVector || customPassages) {
        passageVector = this.embeddingService.embedText(
          `${passage.sourceTitle}. ${passage.passageText}`
        );
      }

      const similarity = this.embeddingService.cosineSimilarity(queryVector, passageVector);

      let relevanceCategory;
      if (similarity >= this.strongThreshold) {
        relevanceCategory = RELEVANCE_CATEGORY.STRONG_MATCH;
      } else if (similarity >= this.weakThreshold) {
        relevanceCategory = RELEVANCE_CATEGORY.WEAK_MATCH;
      } else {
        relevanceCategory = RELEVANCE_CATEGORY.NO_EVIDENCE;
      }

      const whyRetrieved = this.generateMatchExplanation(query, passage, similarity, relevanceCategory);

      scoredPassages.push({
        passageId: passage.passageId,
        sourceReference: passage.sourceReference,
        sourceTitle: passage.sourceTitle,
        documentType: passage.documentType,
        proposalVersion: passage.proposalVersion || 1,
        similarityScore: similarity,
        relevanceCategory,
        passageText: passage.passageText,
        whyRetrieved,
        metadata: passage.metadata || {},
      });
    }

    // Sort by similarity descending
    scoredPassages.sort((a, b) => b.similarityScore - a.similarityScore);

    const topMatch = scoredPassages.length > 0 && scoredPassages[0].similarityScore >= minThreshold
      ? scoredPassages[0]
      : null;

    const highestScore = scoredPassages.length > 0 ? scoredPassages[0].similarityScore : 0.0;

    // Filter to topK passages
    const retrievedPassages = scoredPassages.slice(0, topK);

    // Determine overall retrieval status and uncertainty fallbacks
    let status;
    let uncertainReason;
    let suggestedQuestions;

    if (!topMatch || highestScore < this.weakThreshold) {
      status = RETRIEVAL_STATUS.UNCERTAIN;
      uncertainReason =
        'Zero candidate passages met the minimum confidence threshold in the approved baseline. The requested capability was not found in approved deliverables.';
      suggestedQuestions = [
        'Could the client clarify if this requirement was discussed in a prior proposal version?',
        'Does this request require technical discovery or a formal change-order estimate?',
      ];
    } else if (highestScore < this.strongThreshold) {
      status = RETRIEVAL_STATUS.WEAK_EVIDENCE;
      uncertainReason =
        `Top candidate "${topMatch.sourceReference}" matched with moderate similarity (${Math.round(highestScore * 100)}%), but contains significant semantic divergence from approved deliverables.`;
      suggestedQuestions = [
        `Does this request extend existing deliverable ${topMatch.sourceReference} or introduce a distinct technical service?`,
      ];
    } else {
      status = RETRIEVAL_STATUS.CANDIDATE_FOUND;
    }

    const output = {
      query,
      topMatch,
      similarityScore: highestScore,
      status,
      retrievedPassages,
      uncertainReason,
      suggestedQuestions,
      safeguardNotice: SAFEGUARD_NOTICE,
      analyzedAt: new Date().toISOString(),
    };

    return RetrievalResultSchema.parse(output);
  }

  /**
   * Generates a clear, explainable rationale for why a passage was retrieved.
   */
  generateMatchExplanation(query, passage, score, category) {
    const queryTokens = this.embeddingService.tokenize(query);
    const passageTokens = this.embeddingService.tokenize(passage.passageText);
    const sharedTokens = queryTokens.filter((t) => passageTokens.includes(t));

    const pct = Math.round(score * 100);

    if (category === RELEVANCE_CATEGORY.STRONG_MATCH) {
      return `High semantic alignment (${pct}%) with approved baseline "${passage.sourceReference}". Shared conceptual context: [${sharedTokens.slice(0, 4).join(', ') || 'semantic intent'}].`;
    }
    if (category === RELEVANCE_CATEGORY.WEAK_MATCH) {
      return `Moderate proximity (${pct}%) to "${passage.sourceReference}". Candidate contains partial overlap but may represent an uncontracted feature expansion.`;
    }
    return `Low similarity score (${pct}%). Lexical and semantic overlap falls below the threshold for reliable evidence.`;
  }
}

const defaultRetrievalService = new RetrievalService();

module.exports = {
  RetrievalService,
  defaultRetrievalService,
  STRONG_MATCH_THRESHOLD,
  MODERATE_MATCH_THRESHOLD,
  SAFEGUARD_NOTICE,
};
