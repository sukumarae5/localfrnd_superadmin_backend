// src/middleware/rateLimiter.middleware.js
const { redis } = require("../config/redis");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

// Fixed-window counter per IP using Redis INCR + EXPIRE.
// Usage: router.post('/login', rateLimit({ windowSeconds: 60, maxRequests: 8, keyPrefix: 'rl:login' }), ...)
function rateLimit({ windowSeconds = 60, maxRequests = 10, keyPrefix = "rl" } = {}) {
  return async (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    let count;

    try {
      count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds); // only set TTL on the first hit in this window
      }
    } catch (err) {
      // Redis being down should never block logins — fail open, just log it
      console.warn("Rate limiter Redis error — failing open:", err.message);
      return next();
    }

    if (count > maxRequests) {
      return next(
        new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, "Too many attempts. Please try again in a minute.")
      );
    }

    next();
  };
}

module.exports = rateLimit;