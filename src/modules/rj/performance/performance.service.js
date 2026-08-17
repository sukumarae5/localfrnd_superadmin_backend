// src/modules/rj/performance/performance.service.js
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const { gradeFromScore, performanceLabel } = require("./performance.constants");
const repo = require("./performance.repository");

function serializeListItem(rj) {
  const snap = rj.performance?.[0];
  return {
    id: rj.id.toString(),
    displayCode: rj.displayCode,
    fullName: rj.user.fullName,
    avatarUrl: rj.user.avatarUrl,
    categories: rj.categories?.map((c) => c.category.name) || undefined,
    rating: rj.avgRating,
    score: snap?.perfScore ?? null,
    completed: snap?.callsCompleted ?? rj.totalCallsCount,
    earnings: null, // populate from earnings module if you want it joined here
  };
}

async function listRJs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 100);

  const [{ rjs, total }, stats] = await Promise.all([
    repo.listRJs({
      page, limit,
      search: query.search,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
      sortBy: query.sortBy || "avgRating",
      sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    }),
    repo.getStatsCards(),
  ]);

  return {
    rjs: rjs.map(serializeListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Powers the "RJ Deep Dive" side panel.
async function getDeepDive(rjId) {
  const rj = await repo.findById(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const [latestSnapshot, snapshots, heatmap, callPerf, badges] = await Promise.all([
    repo.findLatestSnapshot(rjId),
    repo.listSnapshots(rjId, 30),
    repo.getCallHourHeatmap(rjId, 30),
    repo.getCallPerformance(rjId),
    repo.getBadges(rjId),
  ]);

  const score = latestSnapshot?.perfScore ?? 0;

  return {
    rj: {
      id: rj.id.toString(),
      displayCode: rj.displayCode,
      fullName: rj.user.fullName,
      avatarUrl: rj.user.avatarUrl,
      categories: rj.categories?.map((c) => c.category.name) || undefined,
    },
    overallScore: score,
    grade: latestSnapshot?.grade || gradeFromScore(score),
    performanceLabel: performanceLabel(score),
    metrics: {
      callQuality: latestSnapshot?.callQualityScore ?? null,
      attendance: latestSnapshot?.attendancePct ?? null,
      csat: latestSnapshot?.csatScore ?? null,
      responseSecs: latestSnapshot?.avgResponseSecs ?? null,
    },
    callPerformance: callPerf,
    dailyTrend: snapshots.map((s) => ({ date: s.snapshotDate, score: s.perfScore })),
    peakHoursHeatmap: heatmap,
    badges: badges.map((b) => ({ name: b.badgeName, awardedAt: b.awardedAt })),
  };
}

// Manual "recompute now" trigger — normally this runs nightly via a cron
// job calling repo.upsertSnapshot per RJ; exposed here so an admin can force
// a refresh for one RJ without waiting for the job.
async function recomputeSnapshot(rjId) {
  const [callPerf] = await Promise.all([repo.getCallPerformance(rjId)]);

  const totalCalls = callPerf.completedCalls + callPerf.missedDropped;
  const attendancePct = totalCalls > 0 ? (callPerf.completedCalls / totalCalls) * 100 : 100;

  // Simple weighted composite — tune the weights to match your actual
  // business rules once you have real historical data to calibrate against.
  const perfScore = Math.round(attendancePct * 0.5 + Math.min(callPerf.completedCalls, 100) * 0.5);

  const snapshot = await repo.upsertSnapshot(rjId, new Date(), {
    callsCompleted: callPerf.completedCalls,
    callsMissed: callPerf.missedDropped,
    avgDurationSecs: callPerf.avgConversationSecs,
    attendancePct,
    perfScore,
    grade: gradeFromScore(perfScore),
  });

  return { rjId: rjId.toString(), perfScore: snapshot.perfScore, grade: snapshot.grade };
}

module.exports = { listRJs, getDeepDive, recomputeSnapshot };