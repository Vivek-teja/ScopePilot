const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const changeAnalysisMockService = require('./services/changeAnalysisMock.service');
const { ALL_CASES } = require('./fixtures/changeAnalysisFixtures');

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
}

module.exports = new AIController();
