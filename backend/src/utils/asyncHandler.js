/**
 * Async handler wrapper to catch unhandled async errors and forward to error middleware
 * @param {Function} fn - Async express route handler or controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
