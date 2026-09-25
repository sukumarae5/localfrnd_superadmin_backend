// src/socket/io.js
//
// Socket.IO bootstrap. Attaches to the SAME http.Server instance server.js
// already creates for Express — it does not open a second port or replace
// app.listen()/server.listen() with anything.
//
// SCALING NOTE (read before deploying more than one instance):
// This project's existing Redis client (src/config/redis.js) is Upstash's
// REST client (@upstash/redis) — great for the rate limiter and for the
// TTL-backed presence keys in presence.service.js, but it has no pub/sub, so
// it cannot back Socket.IO's Redis adapter (@socket.io/redis-adapter), which
// needs a persistent TCP connection (ioredis/node-redis) to publish/subscribe
// room broadcasts across processes. Concretely: with more than one backend
// instance and no adapter, a broadcast (e.g. presence:update) only reaches
// clients connected to the SAME instance that triggered it. Since this
// project currently runs a single instance, that's not a problem today. If
// you later scale horizontally, either (a) add a real TCP Redis connection
// (Upstash also offers this, or any ioredis-compatible host) and wire in
// @socket.io/redis-adapter, or (b) keep clients pinned to one instance with
// sticky sessions. Nothing below needs to change except adding the adapter.
const { Server } = require("socket.io");
const socketAuthMiddleware = require("./socketAuth.middleware");
const { registerPresenceHandlers } = require("./presence.socket");
const { registerCallHandlers } = require("./call.socket");
const { registerChatHandlers } = require("./chat.socket");

let ioInstance = null;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      // Same allowed-origin source as app.js's Express CORS config — do not
      // widen this independently of that.
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
    // Lets a client that reconnects within this window resume its rooms and
    // miss no buffered events — handles brief network loss / mobile
    // backgrounding without any custom heartbeat code (Socket.IO's built-in
    // ping/pong already detects genuinely dead connections).
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      // Deliberately NOT the engine.io default (true). A recovered session
      // must still pass socketAuthMiddleware, so a token that expired while
      // the client was disconnected is rejected instead of silently reused.
      skipMiddlewares: false,
    },
  });

  io.use(socketAuthMiddleware);
  registerPresenceHandlers(io);
  registerCallHandlers(io);
  registerChatHandlers(io);
  
  ioInstance = io;
  return io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized — call initSocket(server) first");
  }
  return ioInstance;
}

module.exports = { initSocket, getIO };