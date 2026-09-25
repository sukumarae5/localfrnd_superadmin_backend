const jwtUtil = require("../utils/jwt");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");
const { prisma } = require("../config/database");

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Missing or malformed Authorization header"
      );
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Access token is missing"
      );
    }

    const secret = process.env.JWT_USER_ACCESS_SECRET;

    if (!secret) {
      console.error("JWT_USER_ACCESS_SECRET is not configured");

      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Authentication configuration error"
      );
    }

    let payload;

    try {
      payload = jwtUtil.verify(token, secret);
    } catch (err) {
      console.error("USER JWT VERIFY ERROR:", {
        name: err.name,
        message: err.message,
      });

      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid or expired access token"
      );
    }

    if (!payload?.userId) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid user token"
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: BigInt(payload.userId),
      },
      select: {
        id: true,
        gender: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "User account not found or inactive"
      );
    }

    req.user = {
      id: user.id,
      gender: user.gender,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authenticateUser,
};