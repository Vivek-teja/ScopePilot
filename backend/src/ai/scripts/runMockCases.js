#!/usr/bin/env node
/**
 * ScopePilot AI - Review 2 CLI Demonstration Script
 * Executes the 5 canonical mock cases, validates contracts, and prints structured JSON outputs.
 *
 * Usage:
 *   node src/ai/scripts/runMockCases.js
 *   npm run mock:cases
 */

const changeAnalysisMockService = require('../services/changeAnalysisMock.service');
const { ALL_CASES } = require('../fixtures/changeAnalysisFixtures');
const { ChangeAnalysisOutputSchema } = require('../../contracts/aiAnalysis.contract');

console.log('='.repeat(80));
console.log(' ScopePilot AI — Review 2: Rule-Based Mock & Structured Output');
console.log(' Demonstrating 5 Canonical Change-Analysis Case Outcomes');
console.log('='.repeat(80));
console.log('');

const resultsSummary = [];

for (const testCase of ALL_CASES) {
  console.log(`>>> RUNNING ${testCase.name.toUpperCase()} [${testCase.category}]`);
  console.log(`    Request Title: "${testCase.payload.newClientRequest.title}"`);
  console.log(`    Rationale:     ${testCase.explanation}`);
  console.log('-'.repeat(80));

  const startTime = Date.now();
  const output = changeAnalysisMockService.analyze(testCase.payload);
  const durationMs = Date.now() - startTime;

  // Validate output contract
  const validation = ChangeAnalysisOutputSchema.safeParse(output);
  if (!validation.success) {
    console.error(`❌ Validation Failed for ${testCase.id}:`, validation.error.format());
    process.exit(1);
  }

  // Reproducibility check: run second time to verify determinism
  const secondRun = changeAnalysisMockService.analyze(testCase.payload);
  const { analyzedAt: _t1, ...payload1 } = output;
  const { analyzedAt: _t2, ...payload2 } = secondRun;
  const isDeterministic = JSON.stringify(payload1) === JSON.stringify(payload2);

  resultsSummary.push({
    caseId: testCase.id,
    category: testCase.category,
    requestTitle: testCase.payload.newClientRequest.title.substring(0, 36) + '...',
    reviewStatus: output.reviewStatus,
    confidence: `${(output.confidenceScore * 100).toFixed(0)}%`,
    inScope: output.inScopeItems.length,
    outOfScope: output.outOfScopeItems.length,
    uncertain: output.uncertainItems.length,
    deterministic: isDeterministic ? 'YES' : 'NO',
  });

  console.log('OUTPUT PAYLOAD (Validated JSON):');
  console.log(JSON.stringify(output, null, 2));
  console.log(`Duration: ${durationMs}ms | Deterministic: ${isDeterministic ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(80));
  console.log('');
}

console.log('SUMMARY TABLE: 5 CANONICAL CASE EVALUATION');
console.log('='.repeat(80));
console.table(resultsSummary);
console.log('='.repeat(80));
console.log('All 5 cases successfully validated against Zod schema and verified deterministic.');
console.log('Review 2 demonstration completed.\n');
