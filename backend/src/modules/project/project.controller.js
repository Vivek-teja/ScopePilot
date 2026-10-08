const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const projectService = require('./project.service');

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.user._id, req.body);
  return ApiResponse.created(res, 'Project created successfully', project);
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user._id);
  return ApiResponse.success(res, 'Project retrieved successfully', project);
});

module.exports = {
  createProject,
  getProjectById,
};
