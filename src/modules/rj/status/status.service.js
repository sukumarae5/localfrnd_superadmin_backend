// src/modules/rj/status/status.service.js
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const repo = require("./status.repository");
const rjRepo = require("../profile/rj.repository");

function serializeOnlineRJ(rj) {
  const activeCall = rj.callsAsRj?.[0];
  return {
    id: rj.id.toString(),
    displayCode: rj.displayCode,
    fullName: rj.user.fullName,
    avatarUrl: rj.user.avatarUrl,
    status: rj.status,
    categories: rj.categories?.map((c) => c.category.name) || undefined,
    currentUser: activeCall ? activeCall.user.fullName : null,
    callDurationSecs: activeCall
      ? Math.round((Date.now() - new Date(activeCall.startedAt).getTime()) / 1000)
      : null,
    lastActiveAt: rj.lastActiveAt,
  };
}

function serializeOfflineRJ(rj) {
  const log = rj.offlineLogs?.[0];
  return {
    id: rj.id.toString(),
    displayCode: rj.displayCode,
    fullName: rj.user.fullName,
    avatarUrl: rj.user.avatarUrl,
    categories: rj.categories?.map((c) => c.category.name) || undefined,
    avgRating: rj.avgRating,
    offlineSince: log?.offlineSince || null,
    reason: log?.reason || null,
  };
}

async function listOnlineRJs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [{ rjs, total }, presence, extra] = await Promise.all([
    repo.listOnlineRJs({
      page, limit,
      search: query.search,
      status: query.status,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
      languageId: query.languageId ? Number(query.languageId) : undefined,
    }),
    repo.getPresenceCounts(),
    repo.getOnlineStatsExtra(),
  ]);

  return {
    rjs: rjs.map(serializeOnlineRJ),
    stats: {
      onlineRJs: presence.totalOnline,
      availableRJs: presence.available,
      busyOnCalls: presence.busyOnCalls,
      waiting: presence.waiting,
      callsInProgress: extra.callsInProgress,
      avgResponseSeconds: extra.avgResponseSeconds,
      earningsToday: extra.earningsToday,
      avgRating: extra.avgRating,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listOfflineRJs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const lastActiveBefore = query.lastActiveHours
    ? new Date(Date.now() - Number(query.lastActiveHours) * 60 * 60 * 1000)
    : undefined;

  const [{ rjs, total }, stats] = await Promise.all([
    repo.listOfflineRJs({
      page, limit,
      search: query.search,
      reason: query.reason,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
      languageId: query.languageId ? Number(query.languageId) : undefined,
      lastActiveBefore,
    }),
    repo.getOfflineStatsExtra(),
  ]);

  return {
    rjs: rjs.map(serializeOfflineRJ),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getLiveActivity(limit = 10) {
  const logs = await repo.getLiveActivity(Number(limit) || 10);
  return logs.map((l) => ({
    id: l.id.toString(),
    rjName: l.rj?.user?.fullName || null,
    eventType: l.eventType,
    description: l.description,
    createdAt: l.createdAt,
  }));
}

// Powers the "Call Monitoring" panel — active call + live device status.
async function getCallMonitoring(rjId) {
  const rj = await rjRepo.findById(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const [activeCall, device] = await Promise.all([
    repo.findActiveCall(rjId),
    repo.findActiveDeviceSession(rjId),
  ]);

  return {
    rj: { id: rj.id.toString(), displayCode: rj.displayCode, fullName: rj.user.fullName, status: rj.status },
    activeCall: activeCall
      ? {
          id: activeCall.id.toString(),
          callerName: activeCall.user.fullName,
          callerDisplayCode: activeCall.user.displayCode,
          startedAt: activeCall.startedAt,
          durationSecs: Math.round((Date.now() - new Date(activeCall.startedAt).getTime()) / 1000),
          quality: activeCall.quality,
        }
      : null,
    device: device
      ? {
          deviceModel: device.deviceModel,
          osVersion: device.osVersion,
          batteryPct: device.batteryPct,
          networkType: device.networkType,
          networkStrength: device.networkStrength,
          lastPingAt: device.lastPingAt,
        }
      : null,
  };
}

// "End" button on the call monitoring panel — admin force-ends an ongoing call.
// NOTE: Mute/Listen are live-audio controls, not DB state — those go over
// your Socket.io/calling-provider channel, not through this REST endpoint.
async function forceEndCall(callSessionId) {
  const updated = await repo.endCallSession(callSessionId);
  await repo.logActivity(updated.rjId, "call_force_ended", "Call ended by admin");
  return { id: updated.id.toString(), status: updated.status, endedAt: updated.endedAt };
}

// Called by the RJ mobile app periodically (device ping). Keeps presence,
// device status, and offline-log bookkeeping in sync in one call.
async function recordHeartbeat(rjId, deviceMeta) {
  const rj = await rjRepo.findById(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  await repo.upsertDeviceHeartbeat(rjId, {
    deviceModel: deviceMeta.deviceModel || null,
    osVersion: deviceMeta.osVersion || null,
    batteryPct: deviceMeta.batteryPct ?? null,
    networkType: deviceMeta.networkType || null,
    networkStrength: deviceMeta.networkStrength || null,
  });

  if (rj.status === "offline") {
    const openLog = await repo.findOpenOfflineLog(rjId);
    if (openLog) await repo.closeOfflineLog(openLog.id);
    await repo.updateRJPresence(rjId, "online");
    await repo.logActivity(rjId, "went_online", "RJ came online");
  } else {
    await repo.updateRJPresence(rjId, rj.status);
  }

  return { rjId: rjId.toString(), status: "online" };
}

// App- or admin-triggered — moves an RJ offline and opens a fresh offline log.
async function goOffline(rjId, reason = "logged_out") {
  const rj = await rjRepo.findById(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  await repo.updateRJPresence(rjId, "offline");
  await repo.endDeviceSession(rjId);
  await repo.createOfflineLog(rjId, reason);
  await repo.logActivity(rjId, "went_offline", `RJ went offline (${reason})`);

  return { rjId: rjId.toString(), status: "offline", reason };
}

// "Send Notification" button on the Offline RJs screen. Persists an
// activity-log trail; actual push delivery goes through your existing
// Firebase (FCM) config — wire that call in wherever you send push today.
async function sendOfflineNotification(rjIds, message) {
  await Promise.all(rjIds.map((id) => repo.logActivity(id, "notification_sent", message)));
  return { notifiedCount: rjIds.length };
}

module.exports = {
  listOnlineRJs,
  listOfflineRJs,
  getLiveActivity,
  getCallMonitoring,
  forceEndCall,
  recordHeartbeat,
  goOffline,
  sendOfflineNotification,
};