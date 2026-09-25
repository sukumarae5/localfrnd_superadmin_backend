// src/modules/presence/presence.controller.js
// Thin controllers — all presence logic lives in src/socket/presence.service.js,
// the same PresenceManager the Socket.IO layer uses, so REST and sockets can
// never disagree about who's online.
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const presenceService = require("../../socket/presence.service");

async function getRJPresence(req, res, next) {
  try {
    const online = await presenceService.isOnline("rj", req.params.id);
    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, {
          id: req.params.id,
          role: "RJ",
          status: online ? "online" : "offline",
        })
      );
  } catch (err) {
    next(err);
  }
}

async function getUserPresence(req, res, next) {
  try {
    const online = await presenceService.isOnline("user", req.params.id);
    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, {
          id: req.params.id,
          role: "USER",
          status: online ? "online" : "offline",
        })
      );
  } catch (err) {
    next(err);
  }
}

// Raw Socket.IO connection registry — distinct from GET /api/rj-status/online,
// which is the fuller DB-driven list (pagination, stats, categories, etc).
// This is a lightweight id-only list, mainly useful for polling clients that
// aren't connected over Socket.IO.
function listOnlineRJs(req, res) {
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { role: "RJ", ids: presenceService.listOnlineIds("rj") }));
}

function listOnlineUsers(req, res) {
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { role: "USER", ids: presenceService.listOnlineIds("user") }));
}

module.exports = { getRJPresence, getUserPresence, listOnlineRJs, listOnlineUsers };
