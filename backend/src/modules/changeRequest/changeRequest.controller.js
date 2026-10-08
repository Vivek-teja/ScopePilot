const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const changeRequestService = require('./changeRequest.service');

const createChangeRequest = asyncHandler(async (req, res) => {
  const result = await changeRequestService.createChangeRequest(req.user._id, req.body);
  return ApiResponse.created(res, 'Change request submitted successfully', result);
});

const getChangeRequestById = asyncHandler(async (req, res) => {
  const result = await changeRequestService.getChangeRequestById(req.params.id);
  return ApiResponse.success(res, 'Change request retrieved successfully', result);
});

const recordDecision = asyncHandler(async (req, res) => {
  const result = await changeRequestService.recordDecision(req.params.id, req.user, req.body);
  return ApiResponse.success(res, 'Change request decision recorded successfully', result);
});

module.exports = {
  createChangeRequest,
  getChangeRequestById,
  recordDecision,
};
