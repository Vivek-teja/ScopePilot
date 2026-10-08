const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const authService = require('./auth.service');
const { HTTP_STATUS } = require('../../constants/httpStatus');

/**
 * Auth Controller
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, 'User registered successfully', result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ApiResponse.success(res, 'Login successful', result, HTTP_STATUS.OK);
});

const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user._id);
  return ApiResponse.success(res, 'Current user retrieved successfully', profile);
});

module.exports = {
  register,
  login,
  getMe,
};
