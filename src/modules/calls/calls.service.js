const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./calls.repository");
const queue = require("../../socket/callQueue.util");
const {
  CALL_RATES, RJ_EARN_RATE_PER_MINUTE, CALL_ERRORS, END_REASONS,
  DIRECT_CALL_RING_TIMEOUT_MS, LOCAL_MATCH_LEVELS,
} = require("./calls.constants");

function io() {
  return require("../../socket/io").getIO();
}

const ringTimers = new Map(); // sessionPublicId -> NodeJS.Timeout

function serializeSession(session, extra = {}) {
  return {
    sessionPublicId: session.publicId,
    rjId: session.rjId.toString(),
    userId: session.userId.toString(),
    callType: session.callType,
    callMode: session.callMode,
    coinRatePerMinute: session.coinRatePerMinute,
    status: session.status,
    startedAt: session.startedAt,
    ...extra,
  };
}

async function assertUserCanStartCall(userId, callType) {
  const rate = CALL_RATES[callType];
  const wallet = await require("../wallet/wallet.repository").findWalletByUserId(userId);
  if (!wallet) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found", CALL_ERRORS.WALLET_NOT_FOUND);
  if (wallet.isFrozen) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your wallet is frozen", CALL_ERRORS.WALLET_FROZEN);
  if (BigInt(wallet.coins) < BigInt(rate)) {
    throw new ApiError(HTTP_STATUS.PAYMENT_REQUIRED || 402, `You need at least ${rate} coins to start a ${callType} call`, CALL_ERRORS.INSUFFICIENT_COINS);
  }
  return rate;
}

// ---- RJ side ----

async function startRJSearch(rjId, callType) {
  const rj = await repo.findAvailableRJ(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const activeOrRinging = await repo.findActiveOrRingingSessionForRJ(rjId);
  if (activeOrRinging) return serializeSession(activeOrRinging, { status: activeOrRinging.status });

  const alreadySearching = await queue.isSearching("rj", rjId);
  if (alreadySearching === callType) return { status: "searching", callType };
  if (alreadySearching && alreadySearching !== callType) {
    await queue.cancelWaiting("rj", rjId, alreadySearching);
  }

  const matchedUserId = await queue.dequeueWaiting("user", callType);
  if (matchedUserId) {
    return matchAndCreateSession({ rjId: rj.id, userId: matchedUserId, callType, callMode: "random" });
  }

  await queue.enqueueWaiting("rj", rjId, callType);
  await require("../rj/status/status.repository").updateRJPresence(rjId, "busy");
  return { status: "searching", callType };
}

async function cancelRJSearch(rjId) {
  const searching = await queue.isSearching("rj", rjId);
  if (!searching) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "You are not currently searching", CALL_ERRORS.NOT_SEARCHING);
  await queue.cancelWaiting("rj", rjId, searching);
  await require("../rj/status/status.repository").updateRJPresence(rjId, "online");
  return { status: "cancelled" };
}

// ---- User: random ----

async function startUserRandomCall(userId, callType) {
  const user = await repo.findUserBasic(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const activeOrRinging = await repo.findActiveOrRingingSessionForUser(userId);
  if (activeOrRinging) return serializeSession(activeOrRinging, { status: activeOrRinging.status });

  const alreadySearching = await queue.isSearching("user", userId);
  if (alreadySearching === callType) return { status: "searching", callType };
  if (alreadySearching && alreadySearching !== callType) {
    await queue.cancelWaiting("user", userId, alreadySearching);
  }

  await assertUserCanStartCall(userId, callType);

  const matchedRjId = await queue.dequeueWaiting("rj", callType);
  if (matchedRjId) {
    return matchAndCreateSession({ rjId: matchedRjId, userId: user.id, callType, callMode: "random" });
  }

  await queue.enqueueWaiting("user", userId, callType);
  return { status: "searching", callType };
}

async function cancelUserSearch(userId) {
  const searching = await queue.isSearching("user", userId);
  if (!searching) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "You are not currently searching", CALL_ERRORS.NOT_SEARCHING);
  await queue.cancelWaiting("user", userId, searching);
  return { status: "cancelled" };
}

// ---- User: local ----

async function startLocalCall(userId, callType) {
  const user = await repo.findUserBasic(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const activeOrRinging = await repo.findActiveOrRingingSessionForUser(userId);
  if (activeOrRinging) return serializeSession(activeOrRinging, { status: activeOrRinging.status });

  await assertUserCanStartCall(userId, callType);

  const userLoc = await repo.findUserLocation(userId);

  for (const level of LOCAL_MATCH_LEVELS) {
    const myValue = userLoc[level];
    if (!myValue) continue;

    const candidateIds = await queue.peekWaitingOldestFirst("rj", callType);
    if (candidateIds.length === 0) continue;

    const candidates = await repo.findRJsLocationByIds(candidateIds);
    const byId = new Map(candidates.map((c) => [c.id.toString(), c]));

    for (const candidateId of candidateIds) {
      const candidate = byId.get(candidateId);
      if (!candidate) continue;
      if (String(candidate.user[level] || "").toLowerCase() !== String(myValue).toLowerCase()) continue;

      const claimed = await queue.claimWaiting("rj", candidateId, callType);
      if (claimed) {
        return matchAndCreateSession({ rjId: candidateId, userId: user.id, callType, callMode: "local" });
      }
    }
  }

  throw new ApiError(HTTP_STATUS.NOT_FOUND, "No RJ available in your area right now", CALL_ERRORS.NO_LOCAL_MATCH);
}

// ---- User: direct ----

async function startDirectCall(userId, rjId, callType) {
  const user = await repo.findUserBasic(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const activeOrRinging = await repo.findActiveOrRingingSessionForUser(userId);
  if (activeOrRinging) return serializeSession(activeOrRinging, { status: activeOrRinging.status });

  const rj = await repo.findRJForCallTarget(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");
  if (rj.status === "offline" || rj.status === "on_call") {
    throw new ApiError(HTTP_STATUS.CONFLICT, "This RJ is not available right now", CALL_ERRORS.RJ_NOT_AVAILABLE);
  }
  const rjActiveOrRinging = await repo.findActiveOrRingingSessionForRJ(rjId);
  if (rjActiveOrRinging) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "This RJ is not available right now", CALL_ERRORS.RJ_NOT_AVAILABLE);
  }

  await assertUserCanStartCall(userId, callType);

  const session = await repo.createRingingSession({
    rjId, userId, callType, callMode: "direct",
    coinRatePerMinute: CALL_RATES[callType], rjEarnRatePerMinute: RJ_EARN_RATE_PER_MINUTE,
  });

  io().to(`rj:${rjId}`).emit("call:incoming", {
    sessionPublicId: session.publicId, callType, callMode: "direct",
    caller: { userId: String(userId), name: user.fullName, avatarUrl: user.avatarUrl },
  });

  armRingTimeout(session.publicId, session.id, rjId, userId);
  return serializeSession(session, { status: "ringing" });
}

function armRingTimeout(sessionPublicId, sessionId, rjId, userId) {
  const timer = setTimeout(async () => {
    ringTimers.delete(sessionPublicId);
    try {
      const current = await repo.findSessionByPublicId(sessionPublicId);
      if (!current || current.status !== "ringing") return;

      const ended = await repo.endRingingSession(sessionId, "missed", END_REASONS.RING_TIMEOUT);
      if (!ended) return;

      io().to(`user:${userId}`).emit("call:missed", { sessionPublicId, reason: END_REASONS.RING_TIMEOUT });
      io().to(`rj:${rjId}`).emit("call:missed", { sessionPublicId, reason: END_REASONS.RING_TIMEOUT });
    } catch (err) {
      console.error(`ring timeout handling failed for ${sessionPublicId}:`, err.message);
    }
  }, DIRECT_CALL_RING_TIMEOUT_MS);

  ringTimers.set(sessionPublicId, timer);
}

function clearRingTimeout(sessionPublicId) {
  const timer = ringTimers.get(sessionPublicId);
  if (timer) { clearTimeout(timer); ringTimers.delete(sessionPublicId); }
}

async function acceptDirectCall(rjId, sessionPublicId) {
  const session = await repo.findSessionByPublicId(sessionPublicId);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Call session not found", CALL_ERRORS.SESSION_NOT_FOUND);
  if (String(session.rjId) !== String(rjId)) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not your call", CALL_ERRORS.NOT_A_PARTICIPANT);
  if (session.status !== "ringing") throw new ApiError(HTTP_STATUS.CONFLICT, "This call is no longer ringing", CALL_ERRORS.SESSION_NOT_RINGING);

  clearRingTimeout(sessionPublicId);

  try {
    await assertUserCanStartCall(session.userId, session.callType);
  } catch (err) {
    const ended = await repo.endRingingSession(session.id, "missed", END_REASONS.INSUFFICIENT_COINS);
    if (ended) {
      io().to(`user:${session.userId}`).emit("call:ended", { sessionPublicId, endedBy: "system", reason: END_REASONS.INSUFFICIENT_COINS, durationSecs: 0 });
      io().to(`rj:${rjId}`).emit("call:ended", { sessionPublicId, endedBy: "system", reason: END_REASONS.INSUFFICIENT_COINS, durationSecs: 0 });
    }
    throw err;
  }

  const accepted = await repo.acceptRingingSession(session.id, rjId).catch((err) => {
    if (err.message === "SESSION_NOT_RINGING") {
      throw new ApiError(HTTP_STATUS.CONFLICT, "This call is no longer ringing", CALL_ERRORS.SESSION_NOT_RINGING);
    }
    throw err;
  });
  const [rj, user] = await Promise.all([repo.findRJBasic(rjId), repo.findUserBasic(session.userId)]);

  io().to(`user:${session.userId}`).emit("call:matched", {
    sessionPublicId, callType: session.callType, callMode: session.callMode,
    peer: { role: "rj", id: String(rjId), name: rj?.user?.fullName || null, avatarUrl: rj?.user?.avatarUrl || null },
  });
  io().to(`rj:${rjId}`).emit("call:matched", {
    sessionPublicId, callType: session.callType, callMode: session.callMode,
    peer: { role: "user", id: String(session.userId), name: user?.fullName || null, avatarUrl: user?.avatarUrl || null },
  });

  return serializeSession(accepted);
}

async function rejectDirectCall(rjId, sessionPublicId) {
  const session = await repo.findSessionByPublicId(sessionPublicId);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Call session not found", CALL_ERRORS.SESSION_NOT_FOUND);
  if (String(session.rjId) !== String(rjId)) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not your call", CALL_ERRORS.NOT_A_PARTICIPANT);
  if (session.status !== "ringing") throw new ApiError(HTTP_STATUS.CONFLICT, "This call is no longer ringing", CALL_ERRORS.SESSION_NOT_RINGING);

  clearRingTimeout(sessionPublicId);
  const ended = await repo.endRingingSession(session.id, "rejected", END_REASONS.RJ_REJECTED);
  if (!ended) throw new ApiError(HTTP_STATUS.CONFLICT, "This call is no longer ringing", CALL_ERRORS.SESSION_NOT_RINGING);

  io().to(`user:${session.userId}`).emit("call:rejected", { sessionPublicId });
  return serializeSession(ended, { status: "rejected" });
}

async function cancelRingingCall(userId, sessionPublicId) {
  const session = await repo.findSessionByPublicId(sessionPublicId);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Call session not found", CALL_ERRORS.SESSION_NOT_FOUND);
  if (String(session.userId) !== String(userId)) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not your call", CALL_ERRORS.NOT_A_PARTICIPANT);
  if (session.status !== "ringing") throw new ApiError(HTTP_STATUS.CONFLICT, "This call is no longer ringing", CALL_ERRORS.SESSION_NOT_RINGING);

  clearRingTimeout(sessionPublicId);
  const ended = await repo.endRingingSession(session.id, "cancelled", END_REASONS.CALLER_CANCELLED);
  if (!ended) throw new ApiError(HTTP_STATUS.CONFLICT, "This call is no longer ringing", CALL_ERRORS.SESSION_NOT_RINGING);

  io().to(`rj:${session.rjId}`).emit("call:cancelled", { sessionPublicId });
  return serializeSession(ended, { status: "cancelled" });
}

// ---- Shared match (random & local) ----

async function matchAndCreateSession({ rjId, userId, callType, callMode }) {
  const [rj, user] = await Promise.all([repo.findRJBasic(rjId), repo.findUserBasic(userId)]);

  const session = await repo.createSession({
    rjId, userId, callType, callMode, coinRatePerMinute: CALL_RATES[callType], rjEarnRatePerMinute: RJ_EARN_RATE_PER_MINUTE,
  });

  io().to(`user:${userId}`).emit("call:matched", {
    sessionPublicId: session.publicId, callType, callMode,
    peer: { role: "rj", id: String(rjId), name: rj?.user?.fullName || null, avatarUrl: rj?.user?.avatarUrl || null },
  });
  io().to(`rj:${rjId}`).emit("call:matched", {
    sessionPublicId: session.publicId, callType, callMode,
    peer: { role: "user", id: String(userId), name: user?.fullName || null, avatarUrl: user?.avatarUrl || null },
  });

  return { status: "matched", ...serializeSession(session) };
}

// ---- End / lookup ----

async function getActiveCall(actorType, actorId) {
  const session = actorType === "rj" ? await repo.findActiveOrRingingSessionForRJ(actorId) : await repo.findActiveOrRingingSessionForUser(actorId);
  if (!session) return null;
  return serializeSession(session);
}

async function endCall(sessionPublicId, endedBy, reason = END_REASONS.USER_HANGUP) {
  const session = await repo.findSessionByPublicId(sessionPublicId);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Call session not found", CALL_ERRORS.SESSION_NOT_FOUND);
  if (session.status !== "ongoing") return serializeSession(session);

  const durationSecs = Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));
  const ended = await repo.endSession({ sessionId: session.id, rjId: session.rjId, durationSecs, endReason: reason });

  io().to(`user:${session.userId}`).emit("call:ended", { sessionPublicId, endedBy, reason, durationSecs });
  io().to(`rj:${session.rjId}`).emit("call:ended", { sessionPublicId, endedBy, reason, durationSecs });

  return serializeSession(ended, { durationSecs, endReason: reason });
}

// ---- Available RJs ----

async function listAvailableRJs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [rjs, total] = await repo.listAvailableRJsForDirect({
    callType: query.callType, city: query.city, state: query.state, country: query.country, page, limit,
  });

  return {
    rjs: rjs.map((rj) => ({
      rjId: rj.id.toString(), name: rj.user.fullName, avatarUrl: rj.user.avatarUrl, avgRating: rj.avgRating,
      status: rj.status, location: { city: rj.user.city, state: rj.user.state, country: rj.user.country },
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ---- Admin ----

function inferEndedBy(endReason) {
  if (!endReason) return null;
  if (endReason === END_REASONS.USER_HANGUP || endReason === END_REASONS.CALLER_CANCELLED) return "user";
  if (endReason === END_REASONS.RJ_HANGUP || endReason === END_REASONS.RJ_REJECTED) return "rj";
  if (endReason === END_REASONS.ADMIN_FORCE_END) return "admin";
  return "system";
}

function serializeAdminCall(session) {
  return {
    sessionPublicId: session.publicId, callType: session.callType, callMode: session.callMode, status: session.status,
    rj: { id: session.rjId.toString(), displayCode: session.rj?.displayCode, name: session.rj?.user?.fullName },
    user: { id: session.userId.toString(), displayCode: session.user?.displayCode, name: session.user?.fullName },
    startedAt: session.startedAt, endedAt: session.endedAt, durationSecs: session.durationSecs,
    coinsSpent: session.coinsSpent.toString(), earningsAmount: session.earningsAmount,
    coinRatePerMinute: session.coinRatePerMinute, rjEarnRatePerMinute: session.rjEarnRatePerMinute,
    endReason: session.endReason, endedBy: inferEndedBy(session.endReason), quality: session.quality,
  };
}

async function adminListCalls(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { calls, total } = await repo.adminListCalls({
    page, limit, rjId: query.rjId, userId: query.userId, status: query.status,
    callType: query.callType, callMode: query.callMode, dateFrom: query.dateFrom, dateTo: query.dateTo,
  });

  return { calls: calls.map(serializeAdminCall), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function adminGetCallDetail(sessionPublicId) {
  const session = await repo.adminGetCallDetail(sessionPublicId);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Call session not found", CALL_ERRORS.SESSION_NOT_FOUND);
  return { ...serializeAdminCall(session), review: session.review ? { rating: session.review.rating, comment: session.review.comment } : null };
}

async function adminForceEndCall(sessionPublicId) {
  const session = await repo.findSessionByPublicId(sessionPublicId);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Call session not found", CALL_ERRORS.SESSION_NOT_FOUND);
  if (session.status !== "ongoing") return serializeAdminCall(session);

  require("../../socket/callBilling.service").stopBilling(session.publicId);
  const durationSecs = Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));
  const ended = await repo.adminForceEndSession({ sessionId: session.id, rjId: session.rjId, durationSecs });

  io().to(`user:${session.userId}`).emit("call:ended", { sessionPublicId, endedBy: "admin", reason: END_REASONS.ADMIN_FORCE_END, durationSecs });
  io().to(`rj:${session.rjId}`).emit("call:ended", { sessionPublicId, endedBy: "admin", reason: END_REASONS.ADMIN_FORCE_END, durationSecs });

  return serializeAdminCall(ended);
}

// ----------------------------------------------------------------------------
// Call history — "after a call connects, both sides can see it in history"
// plus the counterpart's User.id so the client can send a friend request or
// open a chat straight from a history row (see friends/chat modules, both
// keyed on User.id only — see social.prisma's header comment).
// ----------------------------------------------------------------------------

function serializeHistoryItem(session, counterpartUserId, counterpart) {
  return {
    sessionPublicId: session.publicId,
    status: session.status,
    callType: session.callType,
    callMode: session.callMode,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSecs: session.durationSecs,
    coinsSpent: session.coinsSpent.toString(),
    endReason: session.endReason,
    counterpart: {
      userId: counterpartUserId.toString(),
      fullName: counterpart?.fullName || null,
      avatarUrl: counterpart?.avatarUrl || null,
    },
  };
}

function paginate(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

async function listUserCallHistory(userId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const [sessions, total] = await repo.listUserCallHistory(userId, { page, limit });
  return {
    calls: sessions.map((s) => serializeHistoryItem(s, s.rj.user.id, s.rj.user)),
    pagination: paginate(page, limit, total),
  };
}

async function listRJCallHistory(rjId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const [sessions, total] = await repo.listRJCallHistory(rjId, { page, limit });
  return {
    calls: sessions.map((s) => serializeHistoryItem(s, s.user.id, s.user)),
    pagination: paginate(page, limit, total),
  };
}

async function listUserRecentContacts(userId) {
  const sessions = await repo.listUserRecentContacts(userId);
  return sessions.map((s) => serializeHistoryItem(s, s.rj.user.id, s.rj.user));
}

async function listRJRecentContacts(rjId) {
  const sessions = await repo.listRJRecentContacts(rjId);
  return sessions.map((s) => serializeHistoryItem(s, s.user.id, s.user));
}

async function listUserHistoryWithRJ(userId, counterpartUserId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const [sessions, total] = await repo.listUserHistoryWithRJ(userId, counterpartUserId, { page, limit });
  return {
    calls: sessions.map((s) => serializeHistoryItem(s, counterpartUserId, null)),
    pagination: paginate(page, limit, total),
  };
}

async function listRJHistoryWithUser(rjId, counterpartUserId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const [sessions, total] = await repo.listRJHistoryWithUser(rjId, counterpartUserId, { page, limit });
  return {
    calls: sessions.map((s) => serializeHistoryItem(s, counterpartUserId, null)),
    pagination: paginate(page, limit, total),
  };
}

module.exports = {
  startRJSearch, cancelRJSearch, startUserRandomCall, cancelUserSearch, startLocalCall,
  startDirectCall, acceptDirectCall, rejectDirectCall, cancelRingingCall, getActiveCall, endCall,
  matchAndCreateSession, listAvailableRJs, adminListCalls, adminGetCallDetail, adminForceEndCall,
  listUserCallHistory, listRJCallHistory, listUserRecentContacts, listRJRecentContacts,
  listUserHistoryWithRJ, listRJHistoryWithUser,
};