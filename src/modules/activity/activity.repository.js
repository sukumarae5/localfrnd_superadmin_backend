const { prisma } = require("../../config/database");
const { ONLINE_SESSION_THRESHOLD_MINUTES } = require("./activity.constants");

async function getStats() {
  const now = new Date();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const onlineThreshold = new Date(Date.now() - ONLINE_SESSION_THRESHOLD_MINUTES * 60 * 1000);

  const [
    activeUsers, onlineNow, dauGroup, mauGroup, logins, voiceCalls, coinTxns,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { status: "active", deletedAt: null } }),
    prisma.userSession.count({ where: { isActive: true, lastSeenAt: { gte: onlineThreshold } } }),
    prisma.userActivityLog.findMany({
      where: { createdAt: { gte: startOfDay } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userActivityLog.findMany({
      where: { createdAt: { gte: startOfMonth } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userActivityLog.count({
      where: { createdAt: { gte: startOfDay }, activityType: { code: "login" } },
    }),
    prisma.userActivityLog.count({
      where: { createdAt: { gte: startOfDay }, activityType: { code: "voice_call" } },
    }),
    prisma.userActivityLog.count({
      where: { createdAt: { gte: startOfDay }, activityType: { code: "coin_transaction" } },
    }),
  ]);

  // Avg session duration from sessions that have ended today
  const endedToday = await prisma.userSession.findMany({
    where: { endedAt: { gte: startOfDay, not: null } },
    select: { startedAt: true, endedAt: true },
  });
  const avgSessionMinutes = endedToday.length
    ? Math.round(
        endedToday.reduce((sum, s) => sum + (s.endedAt - s.startedAt) / 60000, 0) / endedToday.length
      )
    : 0;

  return {
    activeUsers,
    onlineNow,
    dau: dauGroup.length,
    mau: mauGroup.length,
    logins,
    voiceCalls,
    coinTransactions: coinTxns,
    avgSessionMinutes,
  };
}

function getLiveFeed(limit = 10) {
  return prisma.userActivityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      activityType: { select: { code: true, label: true } },
    },
  });
}

function buildLogWhere({ search, activityTypeCode, riskLevel, dateFrom, dateTo }) {
  const where = {};
  if (activityTypeCode) where.activityType = { code: activityTypeCode };
  if (riskLevel) where.riskLevel = riskLevel;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }
  if (search) {
    where.user = {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { displayCode: { contains: search, mode: "insensitive" } },
      ],
    };
  }
  return where;
}

async function listLogs({ page, limit, ...filters }) {
  const where = buildLogWhere(filters);
  const skip = (page - 1) * limit;

  const [logs, total] = await prisma.$transaction([
    prisma.userActivityLog.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, displayCode: true, avatarUrl: true } },
        activityType: { select: { code: true, label: true } },
      },
    }),
    prisma.userActivityLog.count({ where }),
  ]);

  return { logs, total };
}

async function listSessions({ userId, isActive, page, limit }) {
  const where = {
    ...(userId ? { userId: BigInt(userId) } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };
  const skip = (page - 1) * limit;

  const [sessions, total] = await prisma.$transaction([
    prisma.userSession.findMany({
      where, skip, take: limit,
      orderBy: { lastSeenAt: "desc" },
      include: { user: { select: { fullName: true, displayCode: true, avatarUrl: true } } },
    }),
    prisma.userSession.count({ where }),
  ]);

  return { sessions, total };
}

function findSessionById(id) {
  return prisma.userSession.findUnique({ where: { id: BigInt(id) } });
}

function endSession(id) {
  return prisma.userSession.update({
    where: { id: BigInt(id) },
    data: { isActive: false, endedAt: new Date() },
  });
}

module.exports = { getStats, getLiveFeed, listLogs, listSessions, findSessionById, endSession };