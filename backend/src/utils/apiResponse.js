const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Standard API Success Response Helper
 * Format:
 * {
 *   "success": true,
 *   "message": "Operation successful",
 *   "data": {}
 * }
 */
class ApiResponse {
  constructor(statusCode, message = 'Operation successful', data = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    if (data !== null && data !== undefined) {
      this.data = data;
    }
  }

  static success(res, message = 'Operation successful', data = {}, statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, message = 'Resource created successfully', data = {}) {
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message,
      data,
    });
  }
}

module.exports = ApiResponse;
