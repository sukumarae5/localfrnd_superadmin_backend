
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

    
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticateUser };