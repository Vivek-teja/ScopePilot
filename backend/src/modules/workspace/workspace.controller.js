const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const workspaceService = require('./workspace.service');

const createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
  return ApiResponse.created(res, 'Workspace created successfully', workspace);
});

const getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
  return ApiResponse.success(res, 'Workspace retrieved successfully', workspace);
});

const inviteMember = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.inviteMember(req.params.id, req.user._id, req.body);
  return ApiResponse.created(res, 'Invitation sent successfully', invitation);
});

const getWorkspaceMembers = asyncHandler(async (req, res) => {
  const members = await workspaceService.getWorkspaceMembers(req.params.id, req.user._id);
  return ApiResponse.success(res, 'Workspace members retrieved successfully', members);
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.acceptInvitation(req.params.id, req.user._id);
  return ApiResponse.success(res, 'Invitation accepted successfully', workspace);
});

const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listWorkspaces(req.user._id);
  return ApiResponse.success(res, 'Workspaces retrieved successfully', workspaces);
});

module.exports = {
  createWorkspace,
  getWorkspaceById,
  inviteMember,
  acceptInvitation,
  getWorkspaceMembers,
  listWorkspaces,
};
