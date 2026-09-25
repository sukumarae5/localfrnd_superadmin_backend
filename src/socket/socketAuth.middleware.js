// src/socket/socketAuth.middleware.js
//
// Socket.IO handshake authentication. Deliberately mirrors the existing HTTP
// auth split instead of introducing a new token system:
//   - src/middleware/auth.middleware.js       -> admin tokens (JWT_ACCESS_SECRET, payload.adminId)
//   - src/middleware/Userauth.middleware.js   -> user tokens  (JWT_USER_ACCESS_SECRET, payload.role === "user")
//   - src/middleware/rjAuth.middleware.js     -> same user token, but the underlying User also
//                                                 has an RJ profile (1:1 extension table)
//
// We reuse jwtUtil.verify (src/utils/jwt.js) exactly as those middlewares do — no second
// JWT implementation. Identity is NEVER taken from anything the client sends; it is only
// ever derived from a signature-verified token, so a socket can't impersonate another
// user/RJ/admin by passing a different id in `auth`.
const jwtUtil = require("../utils/jwt");
const { resolveActorType } = require("../utils/resolveActorType.util");

async function identifyFromToken(token) {
  // 1) Try as an admin token first (same secret/shape as auth.middleware.js).
  try {
    const payload = jwtUtil.verify(token, process.env.JWT_ACCESS_SECRET);
    if (payload && payload.adminId) {
      return { type: "admin", adminId: String(payload.adminId), role: payload.role || null };
    }
  } catch (_) {
    // not a valid admin token — fall through and try the user/RJ path
  }

  // 2) Try as a user/RJ token (same secret/shape as Userauth.middleware.js / rjAuth.middleware.js).
  try {
    const userSecret = process.env.JWT_USER_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET;
    const payload = jwtUtil.verify(token, userSecret);
    if (payload && payload.role === "user" && payload.userId) {
      const actor = await resolveActorType(payload.userId);
      if (actor.type === "rj") {
        // Same account, but she has an RJ profile — for presence purposes this
        // connection represents the RJ, matching rjAuth.middleware.js's semantics.
        return { type: "rj", userId: String(payload.userId), rjId: actor.rjId };
      }
      return { type: "user", userId: String(payload.userId) };
    }
  } catch (_) {
    // not a valid user token either
  }

  return null;
}

function extractToken(socket) {
  const fromAuth = socket.handshake.auth && socket.handshake.auth.token;
  if (fromAuth) return fromAuth;

  const header = socket.handshake.headers && socket.handshake.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.split(" ")[1];

  return null;
}

// Registered with io.use(...). Runs on every connection AND on every
// connectionStateRecovery reconnection (see socket/io.js — skipMiddlewares
// is explicitly set to false so a recovered session can never bypass this
// check, e.g. with a token that expired while the client was disconnected).
async function socketAuthMiddleware(socket, next) {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const identity = await identifyFromToken(token);
    if (!identity) {
      return next(new Error("Invalid or expired token"));
    }

    socket.identity = identity;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
}

module.exports = socketAuthMiddleware;