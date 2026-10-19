const request = require('supertest');
const app = require('../src/app');
const { defaultEmbeddingService } = require('../src/ai/embeddings/embedding.service');
const { defaultCorpusService, CorpusService } = require('../src/ai/rag/corpus.service');
const { defaultRetrievalService } = require('../src/ai/rag/retrieval.service');
const { RETRIEVAL_EXPERIMENT_CASES } = require('../src/ai/fixtures/retrievalExperimentFixtures');
const {
  RELEVANCE_CATEGORY,
  RETRIEVAL_STATUS,
  RetrievalResultSchema,
} = require('../src/contracts/retrieval.contract');

describe('AI Review 3: Embeddings & Semantic Retrieval Experiment', () => {
  // ── 1. Embedding Service Tests ──────────────────────────────────────────────
  describe('EmbeddingService', () => {
    it('should generate unit-normalized Float32Array vectors', () => {
      const vec = defaultEmbeddingService.embedText('Checkout flow and payment validation');
      expect(vec).toBeInstanceOf(Float32Array);
      expect(vec.length).toBe(1024);

      let sumOfSquares = 0;
      for (let i = 0; i < vec.length; i++) {
        sumOfSquares += vec[i] * vec[i];
      }
      expect(Math.sqrt(sumOfSquares)).toBeCloseTo(1.0, 3);
    });

    it('should compute exact cosine similarity of 1.0 for identical text', () => {
      const text = 'Product catalog search and category filtering';
      const vecA = defaultEmbeddingService.embedText(text);
      const vecB = defaultEmbeddingService.embedText(text);
      const sim = defaultEmbeddingService.cosineSimilarity(vecA, vecB);
      expect(sim).toBe(1.0);
    });

    it('should bridge vocabulary differences using semantic clusters', () => {
      const vecA = defaultEmbeddingService.embedText('cellphone dial code');
      const vecB = defaultEmbeddingService.embedText('telephone format E.164');
      const sim = defaultEmbeddingService.cosineSimilarity(vecA, vecB);
      expect(sim).toBeGreaterThan(0.60);
    });

    it('should return low similarity for completely unrelated concepts', () => {
      const vecA = defaultEmbeddingService.embedText('proprietary AS400 warehouse tunnel');
      const vecB = defaultEmbeddingService.embedText('shopping cart checkout order confirmation');
      const sim = defaultEmbeddingService.cosineSimilarity(vecA, vecB);
      expect(sim).toBeLessThan(0.35);
    });
  });

  // ── 2. Corpus Service Tests ─────────────────────────────────────────────────
  describe('CorpusService', () => {
    it('should index canonical approved scope passages with full traceability', () => {
      const passages = defaultCorpusService.getAllPassages();
      expect(passages.length).toBeGreaterThanOrEqual(6);

      for (const p of passages) {
        expect(p).toHaveProperty('passageId');
        expect(p).toHaveProperty('sourceReference');
        expect(p).toHaveProperty('documentType');
        expect(p).toHaveProperty('proposalVersion');
        expect(p).toHaveProperty('sourceTitle');
        expect(p).toHaveProperty('passageText');
        expect(p.metadata).toBeDefined();
      }
    });

    it('should dynamically build passages from runtime proposal and deliverables', () => {
      const customProposal = {
        versionNumber: 2,
        projectId: 'proj_dynamic_99',
        scopeItems: [
          { title: 'Custom Billing', description: 'Stripe recurring subscription billing' },
        ],
      };
      const customDeliverables = [
        {
          id: 'del_sub_01',
          scopeReference: 'DEL-SUB-01',
          title: 'Subscription Engine',
          description: 'Recurring monthly invoices and webhook sync',
          acceptanceCriteria: ['Supports auto-renewal', 'Invoice PDF generation'],
        },
      ];

      const corpus = new CorpusService([]);
      const passages = corpus.buildPassagesFromProposalAndDeliverables(
        customProposal,
        customDeliverables
      );

      expect(passages.length).toBe(2);
      expect(passages[0].sourceReference).toBe('PROP-V2-SCOPE-01');
      expect(passages[1].sourceReference).toBe('DEL-SUB-01');
      expect(passages[1].proposalVersion).toBe(2);
    });
  });

  // ── 3. Canonical Retrieval Experiment Cases ─────────────────────────────────
  describe('Canonical Retrieval Experiment Cases', () => {
    it('EXP-01: should strongly match DEL-CHK-01 when using different colloquial wording', () => {
      const exp = RETRIEVAL_EXPERIMENT_CASES.find((c) => c.experimentId === 'exp-01');
      const result = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });

      expect(result.status).toBe(RETRIEVAL_STATUS.CANDIDATE_FOUND);
      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch.sourceReference).toBe('DEL-CHK-01');
      expect(result.topMatch.relevanceCategory).toBe(RELEVANCE_CATEGORY.STRONG_MATCH);
      expect(result.similarityScore).toBeGreaterThanOrEqual(0.65);
      expect(result.safeguardNotice).toContain('Similarity score indicates lexical and semantic proximity only');
    });

    it('EXP-02: should strongly match DEL-CAT-01 when using commercial product synonyms', () => {
      const exp = RETRIEVAL_EXPERIMENT_CASES.find((c) => c.experimentId === 'exp-02');
      const result = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });

      expect(result.status).toBe(RETRIEVAL_STATUS.CANDIDATE_FOUND);
      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch.sourceReference).toBe('DEL-CAT-01');
      expect(result.topMatch.relevanceCategory).toBe(RELEVANCE_CATEGORY.STRONG_MATCH);
      expect(result.similarityScore).toBeGreaterThanOrEqual(0.65);
    });

    it('EXP-03: should identify weak match on DEL-NOTIF-01 when request requests uncontracted SMS/Push', () => {
      const exp = RETRIEVAL_EXPERIMENT_CASES.find((c) => c.experimentId === 'exp-03');
      const result = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });

      expect(result.status).toBe(RETRIEVAL_STATUS.WEAK_EVIDENCE);
      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch.sourceReference).toBe('DEL-NOTIF-01');
      expect(result.topMatch.relevanceCategory).toBe(RELEVANCE_CATEGORY.WEAK_MATCH);
      expect(result.similarityScore).toBeLessThan(0.65);
      expect(result.similarityScore).toBeGreaterThanOrEqual(0.35);
      expect(result.uncertainReason).toBeDefined();
    });

    it('EXP-04: should flag out-of-scope crypto wallet as weak candidate or out-of-scope proximity', () => {
      const exp = RETRIEVAL_EXPERIMENT_CASES.find((c) => c.experimentId === 'exp-04');
      const result = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });

      expect(result.status).toBe(RETRIEVAL_STATUS.WEAK_EVIDENCE);
      expect(result.topMatch).not.toBeNull();
      expect(result.topMatch.sourceReference).toBe('DEL-PAY-01');
      expect(result.topMatch.relevanceCategory).toBe(RELEVANCE_CATEGORY.WEAK_MATCH);
    });

    it('EXP-05: should trigger fallback when zero evidence exists in approved baseline', () => {
      const exp = RETRIEVAL_EXPERIMENT_CASES.find((c) => c.experimentId === 'exp-05');
      const result = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });

      expect(result.status).toBe(RETRIEVAL_STATUS.UNCERTAIN);
      expect(result.topMatch).toBeNull();
      expect(result.similarityScore).toBeLessThan(0.35);
      expect(result.uncertainReason).toContain('Zero candidate passages met the minimum confidence threshold');
      expect(result.suggestedQuestions.length).toBeGreaterThan(0);
    });

    it('should be bit-for-bit deterministic across consecutive invocations', () => {
      const query = 'Add mobile cellphone dial code picker and format check on the final buying screen';
      const resA = defaultRetrievalService.retrieve({ query, topK: 3, minThreshold: 0.35 });
      const resB = defaultRetrievalService.retrieve({ query, topK: 3, minThreshold: 0.35 });

      const { analyzedAt: _tA, ...payloadA } = resA;
      const { analyzedAt: _tB, ...payloadB } = resB;

      expect(payloadA).toEqual(payloadB);
    });
  });

  // ── 4. REST API Integration Tests ───────────────────────────────────────────
  describe('HTTP Endpoints (/api/ai/rag/*)', () => {
    it('GET /api/ai/rag/corpus should return 200 and all indexed passages', async () => {
      const res = await request(app).get('/api/ai/rag/corpus');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPassages).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(res.body.data.passages)).toBe(true);
    });

    it('GET /api/ai/rag/experiments should return 200 and all 5 canonical cases', async () => {
      const res = await request(app).get('/api/ai/rag/experiments');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalExperiments).toBe(5);
      expect(res.body.data.experiments.length).toBe(5);
    });

    it('GET /api/ai/rag/experiments/run should execute all 5 benchmark cases with allPassed: true', async () => {
      const res = await request(app).get('/api/ai/rag/experiments/run');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allPassed).toBe(true);
      expect(res.body.data.results.length).toBe(5);
    });

    it('POST /api/ai/rag/retrieve should return 200 and valid RetrievalResult payload', async () => {
      const res = await request(app)
        .post('/api/ai/rag/retrieve')
        .send({
          query: 'Add mobile cellphone dial code picker and format check on the final buying screen',
          topK: 3,
          minThreshold: 0.35,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('candidate_found');
      expect(res.body.data.topMatch.sourceReference).toBe('DEL-CHK-01');
      expect(res.body.data.retrievedPassages.length).toBe(3);

      // Validate against Zod schema
      expect(() => RetrievalResultSchema.parse(res.body.data)).not.toThrow();
    });

    it('POST /api/ai/rag/retrieve should reject query shorter than 3 characters with 400', async () => {
      const res = await request(app)
        .post('/api/ai/rag/retrieve')
        .send({ query: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
