const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BCRYPT_SALT_ROUNDS = 12;

const REFRESH_COOKIE_NAME = "refreshToken";

const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — keep in sync with token.util.js

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // requires HTTPS in prod
  sameSite: "lax",
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: "/api/auth", // cookie only sent to auth routes
};

const FAILURE_REASONS = {
  UNKNOWN_EMAIL: "unknown_email",
  ACCOUNT_INACTIVE: "account_inactive",
  ACCOUNT_LOCKED: "account_locked",
  INVALID_PASSWORD: "invalid_password",
};

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  BCRYPT_SALT_ROUNDS,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  FAILURE_REASONS,
};