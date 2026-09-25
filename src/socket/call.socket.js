const repo = require("../modules/calls/calls.repository");
const billing = require("./callBilling.service");
const queue = require("./callQueue.util");
const { END_REASONS } = require("../modules/calls/calls.constants");

function roomFor(sessionPublicId) { return `call:${sessionPublicId}`; }
function idFor(identity) {
  if (identity.type === "rj") return identity.rjId;
  if (identity.type === "user") return identity.userId;
  return null;
}
function respond(ack, data) { if (typeof ack === "function") ack(data); }

async function assertParticipant(socket, sessionPublicId) {
  const session = await repo.findSessionByPublicId(sessionPublicId);
  if (!session || session.status !== "ongoing") return null;
  const { type } = socket.identity;
  const myId = String(idFor(socket.identity));
  const isParticipant = (type === "rj" && String(session.rjId) === myId) || (type === "user" && String(session.userId) === myId);
  return isParticipant ? session : null;
}

function registerCallHandlers(io) {
  io.on("connection", (socket) => {
    socket.activeCallSessionId = null;

    socket.on("call:join", async ({ sessionPublicId } = {}, ack) => {
      try {
        const session = await assertParticipant(socket, sessionPublicId);
        if (!session) return respond(ack, { error: "Not a participant of this call, or call has ended" });

        socket.join(roomFor(sessionPublicId));
        socket.activeCallSessionId = sessionPublicId;
        respond(ack, { joined: true, sessionPublicId });

        const room = io.sockets.adapter.rooms.get(roomFor(sessionPublicId));
        if (room && room.size === 2) {
          io.to(roomFor(sessionPublicId)).emit("call:ready");
          billing.startBilling(io, session);
        }
      } catch (err) { respond(ack, { error: err.message }); }
    });

    socket.on("call:offer", ({ sessionPublicId, sdp } = {}) => {
      socket.to(roomFor(sessionPublicId)).emit("call:offer", { sdp, from: socket.identity.type });
    });
    socket.on("call:answer", ({ sessionPublicId, sdp } = {}) => {
      socket.to(roomFor(sessionPublicId)).emit("call:answer", { sdp, from: socket.identity.type });
    });
    socket.on("call:ice-candidate", ({ sessionPublicId, candidate } = {}) => {
      socket.to(roomFor(sessionPublicId)).emit("call:ice-candidate", { candidate, from: socket.identity.type });
    });

    socket.on("call:hangup", async ({ sessionPublicId } = {}, ack) => {
      try {
        billing.stopBilling(sessionPublicId);
        const reason = socket.identity.type === "rj" ? END_REASONS.RJ_HANGUP : END_REASONS.USER_HANGUP;
        const callsService = require("../modules/calls/calls.service");
        const result = await callsService.endCall(sessionPublicId, socket.identity.type, reason);
        io.socketsLeave(roomFor(sessionPublicId));
        socket.activeCallSessionId = null;
        respond(ack, result);
      } catch (err) { respond(ack, { error: err.message }); }
    });

    socket.on("disconnect", async () => {
      const { type } = socket.identity;
      const myId = idFor(socket.identity);

      if (socket.activeCallSessionId) {
        try {
          billing.stopBilling(socket.activeCallSessionId);
          const callsService = require("../modules/calls/calls.service");
          await callsService.endCall(socket.activeCallSessionId, type, END_REASONS.DISCONNECTED);
        } catch (err) { console.error(`call cleanup on disconnect failed:`, err.message); }
        return;
      }

      if (type === "rj" || type === "user") {
        try {
          const searchingType = await queue.isSearching(type, myId);
          if (searchingType) {
            await queue.cancelWaiting(type, myId, searchingType);
            if (type === "rj") await require("../modules/rj/status/status.repository").updateRJPresence(myId, "online");
          }
        } catch (err) { console.error(`search cleanup on disconnect failed:`, err.message); }
      }
    });
  });
}

module.exports = { registerCallHandlers };