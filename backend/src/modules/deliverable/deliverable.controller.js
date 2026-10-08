const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const deliverableService = require('./deliverable.service');

const createDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await deliverableService.createDeliverable(req.user._id, req.body);
  return ApiResponse.created(res, 'Deliverable created successfully', deliverable);
});

const getDeliverableById = asyncHandler(async (req, res) => {
  const deliverable = await deliverableService.getDeliverableById(req.params.id);
  return ApiResponse.success(res, 'Deliverable retrieved successfully', deliverable);
});

module.exports = {
  createDeliverable,
  getDeliverableById,
};
