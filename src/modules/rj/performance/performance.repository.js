// src/modules/rj/performance/performance.repository.js
const { prisma } = require("../../../config/database");

function buildWhere({ search, categoryId, minScore }) {
  const where = { deletedAt: null };
  if (categoryId) where.categories = { some: { categoryId } };
  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function listRJs({ page, limit, search, categoryId, sortBy, sortOrder, dateFrom }) {
  const where = buildWhere({ search, categoryId });
  const skip = (page - 1) * limit;

  const [rjs, total] = await prisma.$transaction([
    prisma.rJ.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        categories: { include: { category: true } },
        performance: { orderBy: { snapshotDate: "desc" }, take: 1 },
      },
    }),
    prisma.rJ.count({ where }),
  ]);

  return { rjs, total };
}

// Top-of-page stat cards: Total Active RJs / Avg Rating / Calls Today /
// Call Acceptance / Completion Rate
async function getStatsCards() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [activeRJs, avgRatingAgg, callsTodayCount, completedToday, missedToday] = await prisma.$transaction([
    prisma.rJ.count({ where: { deletedAt: null, status: { not: "offline" } } }),
    prisma.rJ.aggregate({ where: { deletedAt: null }, _avg: { avgRating: true } }),
    prisma.rJCallSession.count({ where: { startedAt: { gte: startOfToday } } }),
    prisma.rJCallSession.count({ where: { startedAt: { gte: startOfToday }, status: "completed" } }),
    prisma.rJCallSession.count({ where: { startedAt: { gte: startOfToday }, status: { in: ["missed", "dropped"] } } }),
  ]);

  const decidedToday = completedToday + missedToday;
  const callAcceptance = decidedToday > 0 ? (completedToday / decidedToday) * 100 : 0;

  const durationAgg = await prisma.rJCallSession.aggregate({
    where: { status: "completed", durationSecs: { not: null } },
    _avg: { durationSecs: true },
  });

  return {
    totalActiveRJs: activeRJs,
    avgRating: avgRatingAgg._avg.avgRating || 0,
    callsToday: callsTodayCount,
    callAcceptancePct: Number(callAcceptance.toFixed(1)),
    completionRatePct: Number(callAcceptance.toFixed(1)), // same numerator/denominator basis unless you track a separate "completion" definition
    avgDurationSecs: Math.round(durationAgg._avg.durationSecs || 0),
  };
}

function findById(id) {
  return prisma.rJ.findUnique({
    where: { id: BigInt(id) },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      categories: { include: { category: true } },
    },
  });
}

function findLatestSnapshot(rjId) {
  return prisma.rJPerformanceSnapshot.findFirst({
    where: { rjId: BigInt(rjId) },
    orderBy: { snapshotDate: "desc" },
  });
}

function listSnapshots(rjId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return prisma.rJPerformanceSnapshot.findMany({
    where: { rjId: BigInt(rjId), snapshotDate: { gte: since } },
    orderBy: { snapshotDate: "asc" },
  });
}

// Powers the "Peak Calling Hours Heatmap" — bucket completed calls by hour-of-day.
async function getCallHourHeatmap(rjId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const calls = await prisma.rJCallSession.findMany({
    where: { rjId: BigInt(rjId), startedAt: { gte: since } },
    select: { startedAt: true },
  });

  const buckets = Array(24).fill(0);
  calls.forEach((c) => { buckets[new Date(c.startedAt).getHours()] += 1; });
  return buckets.map((count, hour) => ({ hour, count }));
}

// Call performance breakdown for the deep-dive panel.
async function getCallPerformance(rjId) {
  const [completed, missedDropped, durationAgg] = await prisma.$transaction([
    prisma.rJCallSession.count({ where: { rjId: BigInt(rjId), status: "completed" } }),
    prisma.rJCallSession.count({ where: { rjId: BigInt(rjId), status: { in: ["missed", "dropped"] } } }),
    prisma.rJCallSession.aggregate({
      where: { rjId: BigInt(rjId), status: "completed", durationSecs: { not: null } },
      _avg: { durationSecs: true },
    }),
  ]);

  return { completedCalls: completed, missedDropped, avgConversationSecs: Math.round(durationAgg._avg.durationSecs || 0) };
}

function getBadges(rjId) {
  return prisma.rJBadge.findMany({ where: { rjId: BigInt(rjId) }, orderBy: { awardedAt: "desc" } });
}

// Creates or updates today's snapshot — call this from a nightly cron/job,
// not per-request, since it's an expensive aggregate. Exposed here so the
// service layer can also trigger it manually (e.g. "recompute" admin action).
async function upsertSnapshot(rjId, date, data) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  return prisma.rJPerformanceSnapshot.upsert({
    where: { rjId_snapshotDate: { rjId: BigInt(rjId), snapshotDate: day } },
    create: { rjId: BigInt(rjId), snapshotDate: day, ...data },
    update: data,
  });
}

module.exports = {
  listRJs,
  getStatsCards,
  findById,
  findLatestSnapshot,
  listSnapshots,
  getCallHourHeatmap,
  getCallPerformance,
  getBadges,
  upsertSnapshot,
};