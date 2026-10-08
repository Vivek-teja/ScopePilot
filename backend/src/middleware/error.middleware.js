const ApiError = require('../utils/apiError');
const env = require('../config/env');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Centralized Error Handling Middleware
 * Guarantees a consistent JSON response format across the entire backend:
 * {
 *   "success": false,
 *   "message": "...",
 *   "errors": []
 * }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = ApiError.notFound(message);
  }

  // Handle Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for ${field}. Value already exists.`;
    error = ApiError.conflict(message);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    error = ApiError.badRequest('Database validation failed', errors);
  }

  // Handle JWT errors if not caught earlier
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid authorization token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Authorization token has expired');
  }

  // Handle default unhandled errors
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const responseBody = {
    success: false,
    message: error.message || 'Internal Server Error',
    errors: error.errors || [],
  };

  // Attach stack trace only in development
  if (env.NODE_ENV === 'development' && error.stack) {
    responseBody.stack = error.stack;
  }

  if (env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error('💥 Unhandled Server Error:', err);
  }

  return res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
