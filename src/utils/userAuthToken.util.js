// Parallel to your existing admin token.util.js, but shaped for app users
// instead of admins. Deliberately kept separate rather than editing
// token.util.js, since that file is tied to admin role semantics
// (admin.role.code) and a 7-day refresh expiry that's correct for an admin
// web session but too short for a mobile app.
const crypto = require("crypto");
const { sign } = require("./jwt");
const { hashToken } = require("./token.util"); // reused as-is — pure SHA-256, no admin coupling

const ACCESS_TOKEN_EXPIRY = "1d";
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * ASSUMPTION: set a JWT_USER_ACCESS_SECRET env var so user and admin tokens
 * are signed with different secrets (defense in depth — a leaked admin
 * secret shouldn't also let someone forge user tokens, and vice versa).
 * Falls back to JWT_ACCESS_SECRET if you'd rather share one for now.
 */
function signUserAccessToken(user) {
  return sign(
    {
      userId: user.id.toString(), // internal id, same convention as admin's adminId
      role: "user",
    },
    process.env.JWT_USER_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Same opaque-token pattern as admin refresh tokens (random string, only the
// hash is persisted), just with a longer expiry suited to a mobile app.
function generateUserRefreshToken() {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  return { rawToken, tokenHash, expiresAt };
}

module.exports = {
  signUserAccessToken,
  generateUserRefreshToken,
  REFRESH_TOKEN_EXPIRY_MS,
};