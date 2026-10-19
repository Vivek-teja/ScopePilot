const aiAnalysisContract = require('./aiAnalysis.contract');
const retrievalContract = require('./retrieval.contract');
const agentAnalysisContract = require('./agentAnalysis.contract');

module.exports = {
  ...aiAnalysisContract,
  ...retrievalContract,
  ...agentAnalysisContract,
};


