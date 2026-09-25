const jwtUtil = require("../utils/jwt");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");
const { prisma } = require("../config/database");

async function authenticateRJ(req, res, next) {
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
      console.error("RJ JWT VERIFY ERROR:", {
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

    // Find the actual mobile user
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

   if (String(user.gender).toLowerCase() !== "female") {
  throw new ApiError(
    HTTP_STATUS.FORBIDDEN,
    "Only female users can access RJ endpoints"
  );
}

    // Female user must have an RJ profile
    const rj = await prisma.rJ.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!rj || rj.deletedAt) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "No RJ profile found for this account"
      );
    }

    // If URL contains :id, it must belong to this RJ
    if (
      req.params.id &&
      req.params.id !== rj.id.toString()
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You can only access your own RJ profile"
      );
    }

    req.user = {
      id: user.id,
      gender: user.gender,
    };

    req.rj = {
      id: rj.id,
      userId: user.id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticateRJ,
};