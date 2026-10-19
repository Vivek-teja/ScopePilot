const { defaultRetrievalService, RetrievalService, STRONG_MATCH_THRESHOLD, MODERATE_MATCH_THRESHOLD } = require('../src/ai/rag/retrieval.service');
const { defaultEffortCalculator } = require('../src/ai/tools/effortCalculator.tool');
const { defaultEmbeddingService } = require('../src/ai/embeddings/embedding.service');
const { GroundedAgentService } = require('../src/ai/agent/groundedAgent.service');
const { ALL_CASES } = require('../src/ai/fixtures/changeAnalysisFixtures');
const { RETRIEVAL_STATUS, RELEVANCE_CATEGORY } = require('../src/contracts/retrieval.contract');

describe('AI Edge Cases, LLM Response Validation & Effort Calculation', () => {
  // ── 1. External LLM Output Schema Validation & Fallback Guardrails (Task 1) ─
  describe('GroundedAgentService — Provider Response Hardening', () => {
    const baseInput = ALL_CASES[0].payload;

    it('falls back to localProvider when external provider returns malformed or non-object response', async () => {
      const mockProvider = {
        name: 'mock_llm',
        isAvailable: async () => true,
        generateComparison: jest.fn().mockResolvedValue('Not a valid JSON object'),
      };

      const mockFactory = {
        getProvider: jest.fn().mockResolvedValue({ provider: mockProvider, fallbackUsed: false }),
        localProvider: {
          name: 'local',
          generateComparison: jest.fn().mockResolvedValue({
            summary: 'Local fallback analysis executed',
            reviewStatus: 'uncertain',
            confidenceScore: 0.9,
            inScopeItems: [],
            outOfScopeItems: [],
            uncertainItems: [{ item: 'Test', question: 'Clarify?', missingEvidence: 'None' }],
            affectedDeliverables: [],
            suggestedQuestions: ['Clarification needed?'],
          }),
        },
      };

      const agent = new GroundedAgentService({ providerFactory: mockFactory });
      const result = await agent.analyze(baseInput);

      expect(mockProvider.generateComparison).toHaveBeenCalled();
      expect(mockFactory.localProvider.generateComparison).toHaveBeenCalled();
      expect(result.modelMetadata.fallbackUsed).toBe(true);
      expect(result.modelMetadata.provider).toBe('local');
      expect(result.reviewStatus).toBe('uncertain');
    });

    it('falls back to localProvider when external provider returns invalid reviewStatus enum', async () => {
      const mockProvider = {
        name: 'mock_llm',
        isAvailable: async () => true,
        generateComparison: jest.fn().mockResolvedValue({
          summary: 'Invalid status test',
          reviewStatus: 'totally_approved_by_ai', // Invalid enum value
          confidenceScore: 0.95,
          inScopeItems: [],
          outOfScopeItems: [],
          uncertainItems: [],
          affectedDeliverables: [],
          suggestedQuestions: [],
        }),
      };

      const mockFactory = {
        getProvider: jest.fn().mockResolvedValue({ provider: mockProvider, fallbackUsed: false }),
        localProvider: {
          name: 'local',
          generateComparison: jest.fn().mockResolvedValue({
            summary: 'Safe local fallback',
            reviewStatus: 'uncertain',
            confidenceScore: 0.92,
            inScopeItems: [],
            outOfScopeItems: [],
            uncertainItems: [{ item: 'Test', question: 'Q', missingEvidence: 'E' }],
            affectedDeliverables: [],
            suggestedQuestions: [],
          }),
        },
      };

      const agent = new GroundedAgentService({ providerFactory: mockFactory });
      const result = await agent.analyze(baseInput);

      expect(result.modelMetadata.fallbackUsed).toBe(true);
      expect(result.reviewStatus).toBe('uncertain');
    });

    it('falls back to localProvider when external provider returns out-of-bounds confidence score', async () => {
      const mockProvider = {
        name: 'mock_llm',
        isAvailable: async () => true,
        generateComparison: jest.fn().mockResolvedValue({
          summary: 'Confidence score too high',
          reviewStatus: 'out_of_scope',
          confidenceScore: 1.85, // Invalid > 1.0
          inScopeItems: [],
          outOfScopeItems: [{ item: 'Item', reason: 'Reason' }],
          uncertainItems: [],
          affectedDeliverables: [],
          suggestedQuestions: [],
        }),
      };

      const mockFactory = {
        getProvider: jest.fn().mockResolvedValue({ provider: mockProvider, fallbackUsed: false }),
        localProvider: {
          name: 'local',
          generateComparison: jest.fn().mockResolvedValue({
            summary: 'Fallback triggered by confidence validation',
            reviewStatus: 'uncertain',
            confidenceScore: 0.85,
            inScopeItems: [],
            outOfScopeItems: [],
            uncertainItems: [{ item: 'Item', question: 'Q', missingEvidence: 'E' }],
            affectedDeliverables: [],
            suggestedQuestions: [],
          }),
        },
      };

      const agent = new GroundedAgentService({ providerFactory: mockFactory });
      const result = await agent.analyze(baseInput);

      expect(result.modelMetadata.fallbackUsed).toBe(true);
      expect(result.reviewStatus).toBe('uncertain');
    });

    it('demotes in_scope to uncertain if provider claims in_scope without strong retrieval evidence', async () => {
      // Mock provider returning in_scope
      const mockProvider = {
        name: 'gemini',
        isAvailable: async () => true,
        generateComparison: jest.fn().mockResolvedValue({
          summary: 'LLM claims this is in scope despite zero evidence',
          reviewStatus: 'in_scope',
          confidenceScore: 0.98,
          inScopeItems: [{ item: 'Unsubstantiated feature', reason: 'LLM assumed it was free' }],
          outOfScopeItems: [],
          uncertainItems: [],
          affectedDeliverables: [],
          suggestedQuestions: [],
        }),
      };

      const mockFactory = {
        getProvider: jest.fn().mockResolvedValue({ provider: mockProvider, fallbackUsed: false }),
        localProvider: {
          name: 'local',
          generateComparison: jest.fn(),
        },
      };

      // Mock retrieval returning weak evidence (< 0.65 threshold)
      const mockRetrieval = {
        retrieve: jest.fn().mockReturnValue({
          status: RETRIEVAL_STATUS.WEAK_EVIDENCE,
          retrievedPassages: [
            {
              passageId: 'pass-1',
              sourceReference: 'DEL-01',
              sourceTitle: 'Some Feature',
              documentType: 'deliverable',
              proposalVersion: 1,
              similarityScore: 0.42, // Weak evidence below 0.65
              relevanceCategory: RELEVANCE_CATEGORY.WEAK_MATCH,
              passageText: 'Vaguely related passage.',
              whyRetrieved: 'Low overlap.',
              metadata: {},
            },
          ],
        }),
      };

      const agent = new GroundedAgentService({
        providerFactory: mockFactory,
        retrievalService: mockRetrieval,
      });

      const result = await agent.analyze(baseInput);

      // Must be demoted to uncertain
      expect(result.reviewStatus).toBe('uncertain');
      expect(result.inScopeItems).toHaveLength(0);
      expect(result.uncertainItems).toHaveLength(1);
      expect(result.effortCalculation.estimatedHours).toBeNull();
      expect(result.effortCalculation.estimatedCost).toBeNull();
      expect(result.effortCalculation.isEligibleForBilling).toBe(false);
    });
  });

  // ── 2. Retrieval Service Edge Cases (Task 3) ────────────────────────────────
  describe('RetrievalService Edge Cases', () => {
    it('returns UNCERTAIN with empty retrievedPassages when customPassages array is empty', () => {
      const result = defaultRetrievalService.retrieve({ query: 'checkout phone verification' }, []);
      expect(result.status).toBe(RETRIEVAL_STATUS.UNCERTAIN);
      expect(result.topMatch).toBeNull();
      expect(result.similarityScore).toBe(0.0);
      expect(result.retrievedPassages).toHaveLength(0);
      expect(result.uncertainReason).toContain('Zero candidate passages');
    });

    it('returns 0.0 similarity and UNCERTAIN when query contains only stopwords', () => {
      const result = defaultRetrievalService.retrieve({
        query: 'is that the on at',
        topK: 3,
        minThreshold: 0.35,
      });

      expect(result.status).toBe(RETRIEVAL_STATUS.UNCERTAIN);
      expect(result.similarityScore).toBe(0.0);
    });

    it('categorizes threshold boundary scores correctly (0.65 strong, 0.35 weak)', () => {
      expect(STRONG_MATCH_THRESHOLD).toBe(0.65);
      expect(MODERATE_MATCH_THRESHOLD).toBe(0.35);

      const mockEmbeddingService = {
        embedText: jest.fn().mockReturnValue(new Float32Array(1024)),
        cosineSimilarity: jest.fn(),
        tokenize: (t) => defaultEmbeddingService.tokenize(t),
      };

      const service = new RetrievalService({
        embeddingService: mockEmbeddingService,
        corpusService: {
          getAllPassages: () => [
            { passageId: 'p1', sourceReference: 'REF-1', sourceTitle: 'T1', documentType: 'deliverable', passageText: 'Passage 1' },
          ],
        },
      });

      // Score exactly 0.65 -> CANDIDATE_FOUND
      mockEmbeddingService.cosineSimilarity.mockReturnValueOnce(0.65);
      const resStrong = service.retrieve({ query: 'test', minThreshold: 0.30 });
      expect(resStrong.status).toBe(RETRIEVAL_STATUS.CANDIDATE_FOUND);
      expect(resStrong.topMatch.relevanceCategory).toBe(RELEVANCE_CATEGORY.STRONG_MATCH);

      // Score 0.64 -> WEAK_EVIDENCE
      mockEmbeddingService.cosineSimilarity.mockReturnValueOnce(0.64);
      const resWeak = service.retrieve({ query: 'test', minThreshold: 0.30 });
      expect(resWeak.status).toBe(RETRIEVAL_STATUS.WEAK_EVIDENCE);
      expect(resWeak.topMatch.relevanceCategory).toBe(RELEVANCE_CATEGORY.WEAK_MATCH);

      // Score exactly 0.35 -> WEAK_EVIDENCE
      mockEmbeddingService.cosineSimilarity.mockReturnValueOnce(0.35);
      const resModerate = service.retrieve({ query: 'test', minThreshold: 0.30 });
      expect(resModerate.status).toBe(RETRIEVAL_STATUS.WEAK_EVIDENCE);

      // Score 0.34 -> UNCERTAIN
      mockEmbeddingService.cosineSimilarity.mockReturnValueOnce(0.34);
      const resUncertain = service.retrieve({ query: 'test', minThreshold: 0.30 });
      expect(resUncertain.status).toBe(RETRIEVAL_STATUS.UNCERTAIN);
    });

    it('handles passages with tied similarity scores stably and respects topK', () => {
      const mockEmbeddingService = {
        embedText: jest.fn().mockReturnValue(new Float32Array(1024)),
        cosineSimilarity: jest.fn().mockReturnValue(0.75), // All passages tied at 0.75
        tokenize: (t) => defaultEmbeddingService.tokenize(t),
      };

      const service = new RetrievalService({
        embeddingService: mockEmbeddingService,
        corpusService: {
          getAllPassages: () => [
            { passageId: 'p1', sourceReference: 'REF-1', sourceTitle: 'T1', documentType: 'deliverable', passageText: 'One' },
            { passageId: 'p2', sourceReference: 'REF-2', sourceTitle: 'T2', documentType: 'deliverable', passageText: 'Two' },
            { passageId: 'p3', sourceReference: 'REF-3', sourceTitle: 'T3', documentType: 'deliverable', passageText: 'Three' },
            { passageId: 'p4', sourceReference: 'REF-4', sourceTitle: 'T4', documentType: 'deliverable', passageText: 'Four' },
          ],
        },
      });

      const res = service.retrieve({ query: 'test query', topK: 2 });
      expect(res.retrievedPassages).toHaveLength(2);
      expect(res.status).toBe(RETRIEVAL_STATUS.CANDIDATE_FOUND);
    });
  });

  // ── 3. Effort Calculator Edge Cases & Billing Suppression (Task 3) ───────────
  describe('EffortCalculatorTool Edge Cases', () => {
    it('suppresses cost and billing when options.suppressBilling is true', () => {
      const res = defaultEffortCalculator.calculate(
        {
          reviewStatus: 'out_of_scope',
          outOfScopeItemsCount: 1,
          complexityLevel: 'medium',
          storedHourlyRate: 150,
        },
        { suppressBilling: true }
      );

      expect(res.estimatedHours).toBe(18); // Base 16h * 1.15 = 18h
      expect(res.hourlyRate).toBeNull();
      expect(res.estimatedCost).toBeNull();
      expect(res.isEligibleForBilling).toBe(false);
      expect(res.calculationBasis).toContain('cost is suppressed because no trusted stored project hourly rate');
    });

    it('allows billing when options.suppressBilling is false or omitted', () => {
      const res = defaultEffortCalculator.calculate({
        reviewStatus: 'out_of_scope',
        outOfScopeItemsCount: 1,
        complexityLevel: 'medium',
        storedHourlyRate: 100,
      });

      expect(res.estimatedHours).toBe(18);
      expect(res.hourlyRate).toBe(100);
      expect(res.estimatedCost).toBe(1800);
      expect(res.isEligibleForBilling).toBe(true);
      expect(res.calculationBasis).toContain('at stored project rate of $100/hr = $1800');
    });

    it('rejects zero or negative hourly rates with Zod validation error', () => {
      expect(() =>
        defaultEffortCalculator.calculate({
          reviewStatus: 'out_of_scope',
          storedHourlyRate: 0,
        })
      ).toThrow();

      expect(() =>
        defaultEffortCalculator.calculate({
          reviewStatus: 'out_of_scope',
          storedHourlyRate: -50,
        })
      ).toThrow();
    });

    it('strictly returns null effort and cost for needs_clarification and uncertain', () => {
      for (const status of ['needs_clarification', 'uncertain']) {
        const res = defaultEffortCalculator.calculate({
          reviewStatus: status,
          storedHourlyRate: 120,
        });

        expect(res.estimatedHours).toBeNull();
        expect(res.estimatedCost).toBeNull();
        expect(res.scheduleImpactDays).toBeNull();
        expect(res.isEligibleForBilling).toBe(false);
        expect(res.calculationBasis).toContain('Estimation suppressed');
      }
    });

    it('computes correct baseline hours for all complexity tiers', () => {
      const tiers = [
        { level: 'trivial', base: 4, expectedHours: 5 }, // 4 * 1.15 = 4.6 -> 5
        { level: 'low', base: 8, expectedHours: 9 },      // 8 * 1.15 = 9.2 -> 9
        { level: 'medium', base: 16, expectedHours: 18 },  // 16 * 1.15 = 18.4 -> 18
        { level: 'high', base: 32, expectedHours: 37 },    // 32 * 1.15 = 36.8 -> 37
        { level: 'architectural', base: 60, expectedHours: 69 }, // 60 * 1.15 = 69
      ];

      for (const { level, expectedHours } of tiers) {
        const res = defaultEffortCalculator.calculate({
          reviewStatus: 'out_of_scope',
          outOfScopeItemsCount: 1,
          complexityLevel: level,
          storedHourlyRate: 100,
        });

        expect(res.estimatedHours).toBe(expectedHours);
        expect(res.estimatedCost).toBe(expectedHours * 100);
        expect(res.scheduleImpactDays).toBe(Math.ceil(expectedHours / 6));
      }
    });

    it('scales effort hours with higher out-of-scope item counts', () => {
      // 5 items -> multiplier = 5 * 0.5 + 0.5 = 3.0
      // medium base = 16h * 3.0 = 48h * 1.15 = 55.2 -> 55h
      const res = defaultEffortCalculator.calculate({
        reviewStatus: 'out_of_scope',
        outOfScopeItemsCount: 5,
        complexityLevel: 'medium',
        storedHourlyRate: 100,
      });

      expect(res.estimatedHours).toBe(55);
      expect(res.estimatedCost).toBe(5500);
      expect(res.scheduleImpactDays).toBe(Math.ceil(55 / 6)); // 10 days
    });
  });
});
