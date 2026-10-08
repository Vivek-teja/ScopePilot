const { ZodError } = require('zod');
const ApiError = require('../utils/apiError');

/**
 * Reusable Zod validation middleware
 * @param {Object} schemas - Object containing optional zod schemas for body, params, query
 * @param {import('zod').ZodSchema} [schemas.body] - Zod schema for request body
 * @param {import('zod').ZodSchema} [schemas.params] - Zod schema for request path params
 * @param {import('zod').ZodSchema} [schemas.query] - Zod schema for query strings
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return next(ApiError.badRequest('Validation failed', formattedErrors));
      }
      return next(error);
    }
  };
};

module.exports = validate;
