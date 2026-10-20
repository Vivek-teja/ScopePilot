const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const changeRequestService = require('./changeRequest.service');

const createChangeRequest = asyncHandler(async (req, res) => {
  const result = await changeRequestService.createChangeRequest(req.user._id, req.body, req.user);
  return ApiResponse.created(res, 'Change request submitted successfully', result);
});

const getChangeRequestById = asyncHandler(async (req, res) => {
  const result = await changeRequestService.getChangeRequestById(req.params.id, req.user._id, req.user);
  return ApiResponse.success(res, 'Change request retrieved successfully', result);
});

const recordDecision = asyncHandler(async (req, res) => {
  const result = await changeRequestService.recordDecision(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Change request decision recorded successfully', result);
});

const listChangeRequests = asyncHandler(async (req, res) => {
  const result = await changeRequestService.listChangeRequests(req.user._id, req.query, req.user);
  return ApiResponse.success(res, 'Change requests retrieved successfully', result);
});

const runAiAnalysis = asyncHandler(async (req, res) => {
  const { defaultChangeAgentService } = require('../../ai/agent/changeAgent.service');
  const cr = await changeRequestService.getChangeRequestById(req.params.id, req.user._id, req.user);
  
  // Cleanly extract hexadecimal ObjectId whether cr.project is populated document or string
  const projRaw = cr.project?._id || cr.project?.id || cr.project;
  let projectId = typeof projRaw === 'object' && projRaw !== null && projRaw._id
    ? projRaw._id.toString()
    : (projRaw ? projRaw.toString() : '');
  const hexMatch = projectId.match(/[a-f\d]{24}/i);
  if (hexMatch) {
    projectId = hexMatch[0];
  }

  const result = await defaultChangeAgentService.runChangeAgent(
    {
      projectId,
      changeRequestId: cr._id.toString(),
      requestTitle: cr.title,
      requestDescription: cr.description,
      requestedBy: req.user.name || 'client',
    },
    req.user
  );
  return ApiResponse.success(res, 'Change request AI analysis generated and linked', result);
});

module.exports = {
  createChangeRequest,
  getChangeRequestById,
  recordDecision,
  listChangeRequests,
  runAiAnalysis,
};

