/**
 * CLI Runner: Grounded AI Agent Change Analysis
 *
 * Runs canonical cases through the bounded agent workflow:
 * Retrieval -> Grounded Model -> Effort Tool -> Schema Validation.
 */

const { defaultGroundedAgentService } = require('../agent/groundedAgent.service');
const { ALL_CASES } = require('../fixtures/changeAnalysisFixtures');

async function runAgentEvaluation() {
  console.log('================================================================================');
  console.log(' SCOPEPILOT — REVIEW 4 & 5: GROUNDED AI AGENT CHANGE ANALYSIS PIPELINE');
  console.log(' Role: Vishal | AI / RAG / Change-Analysis Agent');
  console.log(' Architecture: Retrieval (RAG) + Model Interface + Effort Tool + Zod Contract');
  console.log('================================================================================\n');

  const summaryRows = [];
  let allPassed = true;

  for (let i = 0; i < ALL_CASES.length; i++) {
    const testCase = ALL_CASES[i];
    console.log(`>>> EVALUATION CASE ${i + 1}: [${testCase.id.toUpperCase()}] ${testCase.name}`);
    console.log(`    Category:        ${testCase.category}`);
    console.log(`    Request Title:   "${testCase.payload.newClientRequest.title}"`);
    console.log(`    Expected Status: ${testCase.expectedStatus}`);
    console.log('--------------------------------------------------------------------------------');

    try {
      const output = await defaultGroundedAgentService.analyze(testCase.payload);

      const matchesExpected = output.reviewStatus === testCase.expectedStatus;
      if (!matchesExpected) {
        allPassed = false;
      }

      const topRef = output.retrievedEvidence[0] ? output.retrievedEvidence[0].sourceReference : 'NONE';
      const hoursStr = output.effortCalculation.estimatedHours !== null
        ? `${output.effortCalculation.estimatedHours}h ($${output.effortCalculation.estimatedCost})`
        : 'N/A (Suppressed)';

      console.log(`    Actual Status:   ${output.reviewStatus} (Match: ${matchesExpected ? 'PASS' : 'FAIL'})`);
      console.log(`    Confidence:      ${Math.round(output.confidenceScore * 100)}%`);
      console.log(`    Top Evidence:    ${topRef} (Total retrieved: ${output.retrievedEvidence.length})`);
      console.log(`    In-Scope Items:  ${output.inScopeItems.length} | Out-of-Scope: ${output.outOfScopeItems.length} | Uncertain: ${output.uncertainItems.length}`);
      console.log(`    Effort & Cost:   ${hoursStr}`);
      console.log(`    Calculation:     ${output.effortCalculation.calculationBasis}`);
      console.log(`    Model Provider:  ${output.modelMetadata.provider} (${output.modelMetadata.executionTimeMs}ms)`);
      console.log(`    Human Advisory:  ${output.humanReviewDraftNotice.substring(0, 75)}...`);
      console.log('================================================================================\n');

      summaryRows.push({
        caseId: testCase.id,
        category: testCase.category,
        expected: testCase.expectedStatus,
        actual: output.reviewStatus,
        evidence: topRef,
        effort: hoursStr,
        provider: output.modelMetadata.provider,
        verdict: matchesExpected ? 'PASS' : 'FAIL',
      });
    } catch (err) {
      allPassed = false;
      console.error(`    FAILED with error: ${err.message}`);
      summaryRows.push({
        caseId: testCase.id,
        category: testCase.category,
        expected: testCase.expectedStatus,
        actual: 'ERROR',
        evidence: 'N/A',
        effort: 'N/A',
        provider: 'N/A',
        verdict: 'FAIL',
      });
    }
  }

  console.log('SUMMARY BENCHMARK: REVIEWS 4 & 5 GROUNDED AGENT EVALUATION');
  console.log('================================================================================');
  console.table(summaryRows);
  console.log('================================================================================');

  if (allPassed) {
    console.log('All 5 canonical cases passed grounded analysis and contract validation.');
    console.log('Human review draft safeguards verified.');
    return true;
  } else {
    console.error('One or more evaluation cases failed.');
    return false;
  }
}

if (require.main === module) {
  runAgentEvaluation()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal benchmark runner error:', err);
      process.exit(1);
    });
}

module.exports = {
  runAgentEvaluation,
};
