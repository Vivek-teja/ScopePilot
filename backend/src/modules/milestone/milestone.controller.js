const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const milestoneService = require('./milestone.service');

const createMilestone = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.createMilestone(req.user._id, req.body, req.user);
  return ApiResponse.created(res, 'Milestone created successfully', milestone);
});

const getMilestoneById = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.getMilestoneById(req.params.id, req.user._id, req.user);
  return ApiResponse.success(res, 'Milestone retrieved successfully', milestone);
});

const updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.updateMilestone(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Milestone updated successfully', milestone);
});

const addEvidence = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.addEvidence(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Milestone evidence submitted successfully', milestone);
});

const recordDecision = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.recordDecision(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Milestone decision recorded successfully', milestone);
});

const listMilestones = asyncHandler(async (req, res) => {
  const milestones = await milestoneService.listMilestones(req.user._id, req.query, req.user);
  return ApiResponse.success(res, 'Milestones retrieved successfully', milestones);
});

module.exports = {
  createMilestone,
  getMilestoneById,
  updateMilestone,
  addEvidence,
  recordDecision,
  listMilestones,
};
