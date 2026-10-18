const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const proposalService = require('./proposal.service');

const createProposal = asyncHandler(async (req, res) => {
  const result = await proposalService.createProposal(req.user._id, req.body, req.user);
  return ApiResponse.created(res, 'Proposal created successfully', result);
});

const getProposalById = asyncHandler(async (req, res) => {
  const result = await proposalService.getProposalById(req.params.id, req.user._id, req.user);
  return ApiResponse.success(res, 'Proposal retrieved successfully', result);
});

const recordDecision = asyncHandler(async (req, res) => {
  const result = await proposalService.recordDecision(req.params.id, req.user._id, req.body, req.user);
  return ApiResponse.success(res, 'Proposal decision recorded successfully', result);
});

const createProposalVersion = asyncHandler(async (req, res) => {
  const result = await proposalService.createProposalVersion(
    req.params.id,
    req.user._id,
    req.body,
    req.user
  );
  return ApiResponse.created(res, 'Proposal version created successfully', result);
});

const getProposalVersionByNumber = asyncHandler(async (req, res) => {
  const result = await proposalService.getProposalVersionByNumber(
    req.params.id,
    parseInt(req.params.versionNumber, 10),
    req.user._id,
    req.user
  );
  return ApiResponse.success(res, 'Proposal version retrieved successfully', result);
});

const listProposals = asyncHandler(async (req, res) => {
  const result = await proposalService.listProposals(req.user._id, req.query, req.user);
  return ApiResponse.success(res, 'Proposals retrieved successfully', result);
});

module.exports = {
  createProposal,
  getProposalById,
  recordDecision,
  createProposalVersion,
  getProposalVersionByNumber,
  listProposals,
};
