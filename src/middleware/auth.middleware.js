const { verifyAccessToken } = require("../utils/token.util");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "No access token provided");
    }

    const token = header.split(" ")[1];
    const payload = verifyAccessToken(token); // throws if invalid/expired

    req.admin = payload;
    next();
  } catch (err) {
    next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid or expired access token"));
  }
}

function requireRole(...allowedRoleCodes) {
  return (req, res, next) => {
    if (!req.admin || !allowedRoleCodes.includes(req.admin.role)) {
      return next(
        new ApiError(HTTP_STATUS.FORBIDDEN, "You don't have permission to perform this action")
      );
    }
    next();
  };
}

module.exports = { authenticate, requireRole };