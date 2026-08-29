
const jwtUtil = require("../utils/jwt");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");
const { prisma } = require("../config/database");

async function authenticateRJ(req, res, next) {
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

    const rj = await prisma.rJ.findUnique({
      where: { userId: BigInt(payload.userId) },
      select: { id: true, deletedAt: true },
    });

    if (!rj || rj.deletedAt) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "No RJ profile found for this account");
    }

    // :id in the URL must be HER OWN RJ id — never someone else's.
    if (req.params.id && req.params.id !== rj.id.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "You can only update your own RJ status");
    }

    req.rj = { id: rj.id, userId: payload.userId };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticateRJ };