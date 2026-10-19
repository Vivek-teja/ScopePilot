const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const deliverableService = require('./deliverable.service');

const createDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await deliverableService.createDeliverable(req.user._id, req.body, req.user);
  return ApiResponse.created(res, 'Deliverable created successfully', deliverable);
});

const getDeliverableById = asyncHandler(async (req, res) => {
  const deliverable = await deliverableService.getDeliverableById(req.params.id, req.user._id, req.user);
  return ApiResponse.success(res, 'Deliverable retrieved successfully', deliverable);
});

const updateDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await deliverableService.updateDeliverable(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Deliverable updated successfully', deliverable);
});

const addEvidence = asyncHandler(async (req, res) => {
  const deliverable = await deliverableService.addEvidence(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Deliverable evidence submitted successfully', deliverable);
});

const listDeliverables = asyncHandler(async (req, res) => {
  const deliverables = await deliverableService.listDeliverables(req.user._id, req.query, req.user);
  return ApiResponse.success(res, 'Deliverables retrieved successfully', deliverables);
});

module.exports = {
  createDeliverable,
  getDeliverableById,
  updateDeliverable,
  addEvidence,
  listDeliverables,
};
