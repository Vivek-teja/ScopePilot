const ApiError = require('../utils/apiError');

/**
 * 404 Not Found Middleware
 * Forwards a standardized 404 ApiError for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: [${req.method}] ${req.originalUrl}`));
};

module.exports = notFoundHandler;
