const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const milestoneService = require('./milestone.service');

const createMilestone = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.createMilestone(req.user._id, req.body);
  return ApiResponse.created(res, 'Milestone created successfully', milestone);
});

const getMilestoneById = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.getMilestoneById(req.params.id);
  return ApiResponse.success(res, 'Milestone retrieved successfully', milestone);
});

const addEvidence = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.addEvidence(req.params.id, req.user._id, req.body);
  return ApiResponse.success(res, 'Milestone evidence submitted successfully', milestone);
});

const recordDecision = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.recordDecision(req.params.id, req.user._id, req.body);
  return ApiResponse.success(res, 'Milestone decision recorded successfully', milestone);
});

module.exports = {
  createMilestone,
  getMilestoneById,
  addEvidence,
  recordDecision,
};
