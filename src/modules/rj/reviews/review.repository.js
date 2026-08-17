// src/modules/rj/review/review.repository.js
const { prisma } = require("../../../config/database");

function buildWhere({ search, rating, sentiment, status, dateFrom, dateTo }) {
  const where = {};

  if (rating) where.rating = rating;
  if (sentiment) where.sentiment = sentiment;
  if (status) where.status = status;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  if (search) {
    where.OR = [
      { rj: { displayCode: { contains: search, mode: "insensitive" } } },
      { rj: { user: { fullName: { contains: search, mode: "insensitive" } } } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
      { reviewText: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

const listInclude = {
  rj: { select: { id: true, displayCode: true, user: { select: { fullName: true, avatarUrl: true } } } },
  user: { select: { id: true, fullName: true } },
};

async function listReviews({ page, limit, search, rating, sentiment, status, dateFrom, dateTo, sortBy, sortOrder }) {
  const where = buildWhere({ search, rating, sentiment, status, dateFrom, dateTo });
  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.rJReview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: listInclude,
    }),
    prisma.rJReview.count({ where }),
  ]);

  return { reviews, total };
}

// Stat cards: Avg Rating / Total Reviews / 5-Star Reviews / Positive Sentiment %
async function getStats() {
  const [avgAgg, total, fiveStar, positive] = await prisma.$transaction([
    prisma.rJReview.aggregate({ where: { status: "published" }, _avg: { rating: true } }),
    prisma.rJReview.count({ where: { status: "published" } }),
    prisma.rJReview.count({ where: { status: "published", rating: 5 } }),
    prisma.rJReview.count({ where: { status: "published", sentiment: "positive" } }),
  ]);

  const positivePct = total > 0 ? (positive / total) * 100 : 0;

  return {
    avgRating: avgAgg._avg.rating ? Number(avgAgg._avg.rating.toFixed(1)) : 0,
    totalReviews: total,
    fiveStarReviews: fiveStar,
    fiveStarPct: total > 0 ? Number(((fiveStar / total) * 100).toFixed(0)) : 0,
    positiveSentimentPct: Number(positivePct.toFixed(0)),
  };
}

function findById(id) {
  return prisma.rJReview.findUnique({
    where: { id: BigInt(id) },
    include: {
      ...listInclude,
      callSession: { select: { id: true, startedAt: true, durationSecs: true } },
      moderatedBy: { select: { fullName: true } },
    },
  });
}

function createReview(data) {
  return prisma.rJReview.create({ data, include: listInclude });
}

function updateStatus(id, data) {
  return prisma.rJReview.update({
    where: { id: BigInt(id) },
    data,
    include: listInclude,
  });
}

// Recomputes an RJ's summary avgRating/totalCallsCount-adjacent field after
// a review is created/removed, so the RJ profile card stays in sync without
// a separate cron job.
async function recalculateRJAvgRating(rjId) {
  const agg = await prisma.rJReview.aggregate({
    where: { rjId: BigInt(rjId), status: "published" },
    _avg: { rating: true },
  });

  return prisma.rJ.update({
    where: { id: BigInt(rjId) },
    data: { avgRating: agg._avg.rating || 0 },
  });
}

module.exports = {
  listReviews,
  getStats,
  findById,
  createReview,
  updateStatus,
  recalculateRJAvgRating,
};