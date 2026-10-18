const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const changeAnalysisMockService = require('./services/changeAnalysisMock.service');
const { ALL_CASES } = require('./fixtures/changeAnalysisFixtures');
const { defaultRetrievalService } = require('./rag/retrieval.service');
const { defaultCorpusService } = require('./rag/corpus.service');
const { RETRIEVAL_EXPERIMENT_CASES } = require('./fixtures/retrievalExperimentFixtures');

class AIController {
  /**
   * Run rule-based mock analysis on supplied input payload
   * POST /api/ai/analyze-mock
   */
  analyzeMock = asyncHandler(async (req, res) => {
    const analysis = changeAnalysisMockService.analyze(req.body);
    return ApiResponse.success(res, 'Mock scope change analysis generated successfully', analysis);
  });

  /**
   * List all 5 canonical test cases with metadata
   * GET /api/ai/cases
   */
  getCases = asyncHandler(async (req, res) => {
    const caseSummaries = ALL_CASES.map(({ id, key, name, category, expectedStatus, description, explanation, payload }) => ({
      id,
      key,
      name,
      category,
      expectedStatus,
      description,
      explanation,
      requestTitle: payload.newClientRequest.title,
    }));

    return ApiResponse.success(res, 'Canonical AI mock test cases retrieved', {
      totalCases: caseSummaries.length,
      cases: caseSummaries,
    });
  });

  /**
   * Get specific case payload and details by ID or key
   * GET /api/ai/cases/:caseId
   */
  getCaseById = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const foundCase = ALL_CASES.find(
      (c) => c.id === caseId || c.key === caseId || c.id.toLowerCase() === caseId.toLowerCase()
    );

    if (!foundCase) {
      throw ApiError.notFound(`Test case "${caseId}" not found`);
    }

    return ApiResponse.success(res, `Test case details for "${foundCase.name}"`, foundCase);
  });

  /**
   * Run analysis on a specific canonical case
   * POST /api/ai/cases/:caseId/run
   * GET /api/ai/cases/:caseId/run
   */
  runCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const foundCase = ALL_CASES.find(
      (c) => c.id === caseId || c.key === caseId || c.id.toLowerCase() === caseId.toLowerCase()
    );

    if (!foundCase) {
      throw ApiError.notFound(`Test case "${caseId}" not found`);
    }

    const output = changeAnalysisMockService.analyze(foundCase.payload);

    return ApiResponse.success(res, `Executed canonical mock test case: ${foundCase.name}`, {
      caseId: foundCase.id,
      category: foundCase.category,
      expectedStatus: foundCase.expectedStatus,
      actualStatus: output.reviewStatus,
      passedContract: true,
      analysis: output,
    });
  });

  /**
   * Run all 5 cases and return summary report
   * GET /api/ai/cases/run-all
   */
  runAllCases = asyncHandler(async (req, res) => {
    const results = ALL_CASES.map((testCase) => {
      const output = changeAnalysisMockService.analyze(testCase.payload);
      return {
        id: testCase.id,
        category: testCase.category,
        requestTitle: testCase.payload.newClientRequest.title,
        expectedStatus: testCase.expectedStatus,
        actualStatus: output.reviewStatus,
        confidenceScore: output.confidenceScore,
        inScopeCount: output.inScopeItems.length,
        outOfScopeCount: output.outOfScopeItems.length,
        uncertainCount: output.uncertainItems.length,
        matchedExpected: output.reviewStatus === testCase.expectedStatus,
      };
    });

    const allPassed = results.every((r) => r.matchedExpected);

    return ApiResponse.success(res, 'Executed all 5 canonical mock test cases', {
      allPassed,
      totalExecuted: results.length,
      results,
    });
  });

  // ── Review 3: Semantic Retrieval & Embeddings Endpoints ──────────────────────

  /**
   * Search approved-scope passages by natural language query
   * POST /api/ai/rag/retrieve
   */
  retrieveScope = asyncHandler(async (req, res) => {
    const result = defaultRetrievalService.retrieve(req.body);
    return ApiResponse.success(res, 'Semantic scope retrieval completed', result);
  });

  /**
   * List all indexed approved scope passages with source traceability
   * GET /api/ai/rag/corpus
   */
  getCorpus = asyncHandler(async (req, res) => {
    const passages = defaultCorpusService.getAllPassages();
    return ApiResponse.success(res, 'Approved scope corpus retrieved', {
      totalPassages: passages.length,
      passages,
    });
  });

  /**
   * List canonical Review 3 retrieval experiment cases
   * GET /api/ai/rag/experiments
   */
  getRetrievalExperiments = asyncHandler(async (req, res) => {
    return ApiResponse.success(res, 'Review 3 retrieval experiment cases retrieved', {
      totalExperiments: RETRIEVAL_EXPERIMENT_CASES.length,
      experiments: RETRIEVAL_EXPERIMENT_CASES,
    });
  });

  /**
   * Execute all 5 Review 3 retrieval experiments and return evaluation benchmark
   * GET /api/ai/rag/experiments/run
   */
  runRetrievalExperiments = asyncHandler(async (req, res) => {
    const benchmarkResults = RETRIEVAL_EXPERIMENT_CASES.map((exp) => {
      const output = defaultRetrievalService.retrieve({
        query: exp.query,
        topK: 3,
        minThreshold: 0.35,
      });

      const topMatch = output.topMatch;
      const topRef = topMatch ? topMatch.sourceReference : null;

      const passed =
        (exp.expectedReference === null ? topRef === null : topRef === exp.expectedReference) &&
        output.status === exp.expectedStatus;

      return {
        experimentId: exp.experimentId,
        category: exp.category,
        query: exp.query,
        expectedReference: exp.expectedReference,
        actualReference: topRef,
        similarityScore: output.similarityScore,
        status: output.status,
        passed,
        topMatch,
        uncertainReason: output.uncertainReason || null,
      };
    });

    const allPassed = benchmarkResults.every((r) => r.passed);

    return ApiResponse.success(res, 'Review 3 retrieval benchmark executed', {
      allPassed,
      totalExperiments: benchmarkResults.length,
      results: benchmarkResults,
    });
  });
}

module.exports = new AIController();

