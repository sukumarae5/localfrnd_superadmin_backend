// src/modules/rj/status/status.repository.js
const { prisma } = require("../../../config/database");

function buildOnlineWhere({ search, status, categoryId, languageId }) {
  // "online" screen shows every non-offline RJ (online/busy/on_call combined)
  const where = { deletedAt: null, status: { not: "offline" } };
  if (status) where.status = status;
  if (categoryId) where.categories = { some: { categoryId } };
  if (languageId) where.user = { languages: { some: { languageId } } };
  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function listOnlineRJs({ page, limit, search, status, categoryId, languageId }) {
  const where = buildOnlineWhere({ search, status, categoryId, languageId });
  const skip = (page - 1) * limit;

  const [rjs, total] = await prisma.$transaction([
    prisma.rJ.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastActiveAt: "desc" },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        categories: { include: { category: true } },
        callsAsRj: {
          where: { status: "ongoing" },
          take: 1,
          orderBy: { startedAt: "desc" },
          include: { user: { select: { fullName: true } } },
        },
      },
    }),
    prisma.rJ.count({ where }),
  ]);

  return { rjs, total };
}

// Maps directly to the four stat cards on the Online RJs screen:
// Online = online + busy + on_call combined, Available = online,
// Waiting = busy (online but not yet matched to a call), Busy on Calls = on_call.
async function getPresenceCounts() {
  const [available, waiting, busyOnCalls] = await prisma.$transaction([
    prisma.rJ.count({ where: { deletedAt: null, status: "online" } }),
    prisma.rJ.count({ where: { deletedAt: null, status: "busy" } }),
    prisma.rJ.count({ where: { deletedAt: null, status: "on_call" } }),
  ]);
  return { available, waiting, busyOnCalls, totalOnline: available + waiting + busyOnCalls };
}

async function getOnlineStatsExtra() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [avgResponseAgg, avgRatingAgg, earningsTodayAgg, callsInProgress] = await prisma.$transaction([
    prisma.rJ.aggregate({ where: { deletedAt: null, status: { not: "offline" } }, _avg: { avgResponseSeconds: true } }),
    prisma.rJ.aggregate({ where: { deletedAt: null }, _avg: { avgRating: true } }),
    prisma.rJWalletTransaction.aggregate({
      where: { type: "call_earning", createdAt: { gte: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.rJCallSession.count({ where: { status: "ongoing" } }),
  ]);

  return {
    avgResponseSeconds: avgResponseAgg._avg.avgResponseSeconds || 0,
    avgRating: avgRatingAgg._avg.avgRating || 0,
    earningsToday: earningsTodayAgg._sum.amount || 0,
    callsInProgress,
  };
}

function buildOfflineWhere({ search, reason, categoryId, languageId, lastActiveBefore }) {
  const where = { deletedAt: null, status: "offline" };
  if (categoryId) where.categories = { some: { categoryId } };
  if (languageId) where.user = { languages: { some: { languageId } } };
  if (lastActiveBefore) where.lastActiveAt = { lte: lastActiveBefore };
  // reason filters through the still-open offline log (onlineSince null = currently offline for that reason)
  if (reason) where.offlineLogs = { some: { reason, onlineSince: null } };
  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function listOfflineRJs({ page, limit, search, reason, categoryId, languageId, lastActiveBefore }) {
  const where = buildOfflineWhere({ search, reason, categoryId, languageId, lastActiveBefore });
  const skip = (page - 1) * limit;

  const [rjs, total] = await prisma.$transaction([
    prisma.rJ.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastActiveAt: "desc" },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        categories: { include: { category: true } },
        offlineLogs: { orderBy: { offlineSince: "desc" }, take: 1 },
      },
    }),
    prisma.rJ.count({ where }),
  ]);

  return { rjs, total };
}

async function getOfflineStatsExtra() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOffline,
    offlineToday,
    onScheduledBreak,
    loggedOutNormally,
    unexpectedOffline,
    completedLogs,
    activeLast24h,
  ] = await prisma.$transaction([
    prisma.rJ.count({ where: { deletedAt: null, status: "offline" } }),
    prisma.rJOfflineLog.count({ where: { offlineSince: { gte: startOfToday } } }),
    prisma.rJOfflineLog.count({ where: { reason: "scheduled_break", onlineSince: null } }),
    prisma.rJOfflineLog.count({ where: { reason: "logged_out", onlineSince: null } }),
    prisma.rJOfflineLog.count({ where: { reason: "unexpected", onlineSince: null } }),
    prisma.rJOfflineLog.findMany({ where: { onlineSince: { not: null } }, select: { durationMinutes: true } }),
    prisma.rJ.count({ where: { deletedAt: null, lastActiveAt: { gte: last24h } } }),
  ]);

  const avgOfflineDurationHours = completedLogs.length
    ? completedLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) / completedLogs.length / 60
    : 0;

  const monthlyAgg = await prisma.rJWalletTransaction.aggregate({
    where: { type: "call_earning", createdAt: { gte: last30d }, rj: { status: "offline" } },
    _sum: { amount: true },
  });
  const avgMonthlyEarnings = totalOffline > 0 ? (monthlyAgg._sum.amount || 0) / totalOffline : 0;

  return {
    totalOffline,
    offlineToday,
    onScheduledBreak,
    loggedOutNormally,
    unexpectedOffline,
    avgOfflineDurationHours: Number(avgOfflineDurationHours.toFixed(1)),
    activeLast24h,
    avgMonthlyEarnings: Number(avgMonthlyEarnings.toFixed(2)),
  };
}

function getLiveActivity(limit) {
  return prisma.rJActivityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { rj: { include: { user: { select: { fullName: true } } } } },
  });
}

function findActiveCall(rjId) {
  return prisma.rJCallSession.findFirst({
    where: { rjId: BigInt(rjId), status: "ongoing" },
    orderBy: { startedAt: "desc" },
    include: { user: { select: { fullName: true, displayCode: true } } },
  });
}

function findActiveDeviceSession(rjId) {
  return prisma.rJDeviceSession.findFirst({
    where: { rjId: BigInt(rjId), isActive: true },
    orderBy: { lastPingAt: "desc" },
  });
}

async function upsertDeviceHeartbeat(rjId, data) {
  return prisma.$transaction(async (tx) => {
    let session = await tx.rJDeviceSession.findFirst({
      where: { rjId: BigInt(rjId), isActive: true },
      orderBy: { startedAt: "desc" },
    });

    if (session) {
      session = await tx.rJDeviceSession.update({
        where: { id: session.id },
        data: { ...data, lastPingAt: new Date() },
      });
    } else {
      session = await tx.rJDeviceSession.create({
        data: { rjId: BigInt(rjId), ...data, isActive: true },
      });
    }

    return session;
  });
}

function endDeviceSession(rjId) {
  return prisma.rJDeviceSession.updateMany({
    where: { rjId: BigInt(rjId), isActive: true },
    data: { isActive: false, endedAt: new Date() },
  });
}

function findOpenOfflineLog(rjId) {
  return prisma.rJOfflineLog.findFirst({
    where: { rjId: BigInt(rjId), onlineSince: null },
    orderBy: { offlineSince: "desc" },
  });
}

function createOfflineLog(rjId, reason) {
  return prisma.rJOfflineLog.create({
    data: { rjId: BigInt(rjId), reason, offlineSince: new Date() },
  });
}

async function closeOfflineLog(id) {
  const log = await prisma.rJOfflineLog.findUnique({ where: { id: BigInt(id) } });
  if (!log) return null;
  const durationMinutes = Math.round((Date.now() - new Date(log.offlineSince).getTime()) / 60000);
  return prisma.rJOfflineLog.update({
    where: { id: log.id },
    data: { onlineSince: new Date(), durationMinutes },
  });
}

function updateRJPresence(rjId, status) {
  return prisma.rJ.update({
    where: { id: BigInt(rjId) },
    data: { status, lastActiveAt: new Date() },
  });
}

function endCallSession(callSessionId) {
  return prisma.rJCallSession.update({
    where: { id: BigInt(callSessionId) },
    data: { status: "completed", endedAt: new Date() },
  });
}

function logActivity(rjId, eventType, description) {
  return prisma.rJActivityLog.create({
    data: { rjId: BigInt(rjId), eventType, description },
  });
}

module.exports = {
  listOnlineRJs,
  getPresenceCounts,
  getOnlineStatsExtra,
  listOfflineRJs,
  getOfflineStatsExtra,
  getLiveActivity,
  findActiveCall,
  findActiveDeviceSession,
  upsertDeviceHeartbeat,
  endDeviceSession,
  findOpenOfflineLog,
  createOfflineLog,
  closeOfflineLog,
  updateRJPresence,
  endCallSession,
  logActivity,
};