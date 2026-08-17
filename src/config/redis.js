const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});


async function pingRedis() {
  try {
    await redis.set("startup:ping", "ok", { ex: 30 });
    console.log("✅ Redis (Upstash) connected");
  } catch (err) {
    console.warn("⚠️  Redis unreachable — rate limiting will fail open:", err.message);
  }
}

module.exports = { redis, pingRedis };