// Parallel to your existing src/middleware/auth.middleware.js (which handles
// admin tokens) — this handles tokens issued by the OTP login flow instead.
// Kept as a separate file rather than extending auth.middleware.js, since
// admin and user auth are different trust domains with different secrets.
const jwtUtil = require("../utils/jwt");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Missing or malformed Authorization header");
    }

    const token = authHeader.split(" ")[1];
    let payload;

    try {
      payload = jwtUtil.verify(
        token,
        process.env.JWT_USER_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET
      );
    } catch (err) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid or expired token");
    }

    if (payload.role !== "user") {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "This endpoint is only for app users");
    }

    // payload.userId is the internal BigInt id (as a string) — same
    // convention as req.admin.adminId in your admin auth middleware.
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticateUser };