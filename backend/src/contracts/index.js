const aiAnalysisContract = require('./aiAnalysis.contract');
const retrievalContract = require('./retrieval.contract');

module.exports = {
  ...aiAnalysisContract,
  ...retrievalContract,
};

