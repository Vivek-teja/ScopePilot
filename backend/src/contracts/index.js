const aiAnalysisContract = require('./aiAnalysis.contract');
const retrievalContract = require('./retrieval.contract');
const agentAnalysisContract = require('./agentAnalysis.contract');
const scopeChatContract = require('./scopeChat.contract');
const changeAgentContract = require('./changeAgent.contract');

module.exports = {
  ...aiAnalysisContract,
  ...retrievalContract,
  ...agentAnalysisContract,
  ...scopeChatContract,
  ...changeAgentContract,
};



