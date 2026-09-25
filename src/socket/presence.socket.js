// src/socket/presence.socket.js
// Registers the `connection` handler and presence-related events. Contains no
// business logic itself — everything delegates to presence.service.js so the
// REST API (src/modules/presence) and Socket.IO stay in sync.
const presenceService = require("./presence.service");

function idFor(identity) {
  if (identity.type === "admin") return identity.adminId;
  if (identity.type === "rj") return identity.rjId;
  return identity.userId; // type === "user"
}

function normalizeRole(role) {
  if (!role) return null;
  const r = String(role).toLowerCase();
  return ["user", "rj", "admin"].includes(r) ? r : null;
}

function respond(ack, data) {
  if (typeof ack === "function") ack(data);
}

function registerPresenceHandlers(io) {
  io.on("connection", (socket) => {
    const { type } = socket.identity;
    const id = idFor(socket.identity);

    // Personal room (lets the server target this exact account later, e.g.
    // "your call has been picked up") and, for admins, a shared dashboard room.
    socket.join(`${type}:${id}`);
    if (type === "admin") socket.join("admins");

    // The friends/chat/notifications layer (src/modules/friends,
    // src/modules/chat, src/modules/notifications) is deliberately keyed on
    // User.id only — it never knows RJ exists (see social.prisma's header
    // comment). An RJ's socket therefore also needs to sit in her
    // `user:<userId>` room, in addition to `rj:<rjId>`, or a friend request /
    // chat message addressed to her by userId would have nowhere to land.
    if (type === "rj" && socket.identity.userId) {
      socket.join(`user:${socket.identity.userId}`);
    }

    presenceService
      .connect(type, id, socket.id)
      .catch((err) => console.error(`presence connect(${type}:${id}) failed:`, err.message));

    // Client -> Server: presence:get { role, id } -> ack({ role, id, status })
    socket.on("presence:get", async (payload = {}, ack) => {
      const targetRole = normalizeRole(payload.role);
      if (!targetRole || !payload.id) {
        return respond(ack, { error: "role and id are required" });
      }
      const online = await presenceService.isOnline(targetRole, payload.id);
      respond(ack, { role: targetRole.toUpperCase(), id: String(payload.id), status: online ? "online" : "offline" });
    });

    // Admin-only bulk lookups — not exposed to user/RJ sockets to avoid
    // letting any client enumerate every online account.
    socket.on("presence:getUsers", (_payload, ack) => {
      if (socket.identity.type !== "admin") return respond(ack, { error: "Forbidden" });
      respond(ack, { role: "USER", ids: presenceService.listOnlineIds("user") });
    });

    socket.on("presence:getRJs", (_payload, ack) => {
      if (socket.identity.type !== "admin") return respond(ack, { error: "Forbidden" });
      respond(ack, { role: "RJ", ids: presenceService.listOnlineIds("rj") });
    });

    // Opt-in room join so a client can watch one specific account's presence
    // (e.g. a User app watching whether a particular RJ is online) without
    // broadcasting everyone's presence to everyone.
    socket.on("presence:watch", (payload = {}) => {
      const targetRole = normalizeRole(payload.role);
      if (targetRole && payload.id) socket.join(`presence:${targetRole}:${payload.id}`);
    });

    socket.on("presence:unwatch", (payload = {}) => {
      const targetRole = normalizeRole(payload.role);
      if (targetRole && payload.id) socket.leave(`presence:${targetRole}:${payload.id}`);
    });

    socket.on("disconnect", (reason) => {
      presenceService
        .disconnect(type, id, socket.id, reason)
        .catch((err) => console.error(`presence disconnect(${type}:${id}) failed:`, err.message));
    });
  });
}

module.exports = { registerPresenceHandlers };