const ApiError = require('../utils/apiError');
const { verifyToken } = require('../utils/jwt');
const User = require('../modules/auth/auth.model');

/**
 * Authentication middleware: ensures the request has a valid Bearer token
 * and attaches the authenticated user to req.user.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required. Missing or invalid Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Authentication token missing.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Authentication token has expired.');
      }
      throw ApiError.unauthorized('Invalid authentication token.');
    }

    // Attach decoded user info; fetch full user document if needed
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles - Allowed system roles (e.g. 'freelancer', 'client', 'admin')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden. Access requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
        )
      );
    }

    return next();
  };
};

/**
 * Optional authentication middleware: if a valid token is provided, attaches req.user,
 * otherwise proceeds without throwing an error.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (user) {
          req.user = user;
        }
      }
    }
    return next();
  } catch {
    // Proceed unauthenticated on error
    return next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth,
};
