const { defaultRetrievalService } = require('../rag/retrieval.service');
const { RETRIEVAL_EXPERIMENT_CASES } = require('../fixtures/retrievalExperimentFixtures');
const { RETRIEVAL_STATUS } = require('../../contracts/retrieval.contract');

function runAllExperiments() {
  console.log('================================================================================');
  console.log(' SCOPEPILOT — REVIEW 3: EMBEDDINGS & APPROVED-SCOPE RETRIEVAL EXPERIMENT');
  console.log(' Role: Vishal | AI / RAG / Change-Analysis Agent');
  console.log(' Objective: Evaluate semantic retrieval when client uses altered natural wording');
  console.log('================================================================================\n');

  const summaryRows = [];
  let allPassed = true;

  for (let i = 0; i < RETRIEVAL_EXPERIMENT_CASES.length; i++) {
    const exp = RETRIEVAL_EXPERIMENT_CASES[i];
    console.log(`>>> EXPERIMENT ${i + 1}: [${exp.experimentId.toUpperCase()}] ${exp.category}`);
    console.log(`    Query:      "${exp.query}"`);
    console.log(`    Hypothesis: ${exp.hypothesis}`);
    console.log('--------------------------------------------------------------------------------');

    const startTime = process.hrtime.bigint();
    const result1 = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });
    const result2 = defaultRetrievalService.retrieve({ query: exp.query, topK: 3, minThreshold: 0.35 });
    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1000000n);

    // Verify bit-for-bit determinism (excluding volatile timestamp)
    const { analyzedAt: t1, ...payload1 } = result1;
    const { analyzedAt: t2, ...payload2 } = result2;
    const isDeterministic = JSON.stringify(payload1) === JSON.stringify(payload2);

    const topMatch = result1.topMatch;
    const topRef = topMatch ? topMatch.sourceReference : 'NONE';
    const scorePct = `${Math.round(result1.similarityScore * 100)}%`;

    // Validate expectations
    let passed = true;
    if (exp.expectedReference !== null && (!topMatch || topMatch.sourceReference !== exp.expectedReference)) {
      passed = false;
    }
    if (exp.expectedReference === null && topMatch !== null) {
      passed = false;
    }
    if (result1.status !== exp.expectedStatus) {
      passed = false;
    }
    if (!isDeterministic) {
      passed = false;
    }

    if (!passed) {
      allPassed = false;
    }

    console.log(`    Top Match:          ${topRef} (${topMatch ? topMatch.sourceTitle : 'No passage met threshold'})`);
    console.log(`    Similarity Score:   ${scorePct} (Raw: ${result1.similarityScore})`);
    console.log(`    Retrieval Status:   ${result1.status}`);
    console.log(`    Match Category:     ${topMatch ? topMatch.relevanceCategory : 'no_evidence'}`);
    if (result1.uncertainReason) {
      console.log(`    Uncertainty Reason: ${result1.uncertainReason}`);
    }
    if (result1.suggestedQuestions && result1.suggestedQuestions.length > 0) {
      console.log(`    Client Questions:   ${result1.suggestedQuestions[0]}`);
    }
    console.log(`    Duration:           ${durationMs}ms | Deterministic: ${isDeterministic ? 'PASS' : 'FAIL'} | Result: ${passed ? 'PASS' : 'FAIL'}`);
    console.log('================================================================================\n');

    summaryRows.push({
      expId: exp.experimentId,
      category: exp.category,
      query: exp.query.length > 38 ? `${exp.query.substring(0, 35)}...` : exp.query,
      topRef,
      score: scorePct,
      status: result1.status,
      deterministic: isDeterministic ? 'YES' : 'NO',
      verdict: passed ? 'PASS' : 'FAIL',
    });
  }

  console.log('SUMMARY TABLE: REVIEW 3 SEMANTIC RETRIEVAL BENCHMARK');
  console.log('================================================================================');
  console.table(summaryRows);
  console.log('================================================================================');

  if (allPassed) {
    console.log('All 5 semantic retrieval experiments passed all criteria deterministically.');
    console.log('Review 3 demonstration successfully verified.');
    process.exit(0);
  } else {
    console.error('One or more retrieval experiments failed validation.');
    process.exit(1);
  }
}

if (require.main === module) {
  runAllExperiments();
}

module.exports = {
  runAllExperiments,
};
