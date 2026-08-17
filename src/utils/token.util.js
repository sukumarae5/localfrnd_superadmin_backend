// src/utils/token.util.js
const crypto = require("crypto");
const { sign, verify } = require("./jwt");

const ACCESS_TOKEN_EXPIRY = "1d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function signAccessToken(admin) {
  return sign(
    {
      adminId: admin.id.toString(),
      role: admin.role?.code || null,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function verifyAccessToken(token) {
  return verify(token, process.env.JWT_ACCESS_SECRET);
}

// Refresh tokens are opaque random strings, not JWTs — we store only a hash
// of them in the DB (admin_auth_sessions.refresh_token_hash), so a leaked DB
// row alone can never be used to log in.
function generateRefreshToken() {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  return { rawToken, tokenHash, expiresAt };
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_EXPIRY_MS,
};