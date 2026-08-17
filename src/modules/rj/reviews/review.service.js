// src/modules/rj/review/review.service.js
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const { sentimentFromRating } = require("./review.constants");
const repo = require("./review.repository");

function serializeListItem(r) {
  return {
    id: r.id.toString(),
    rj: {
      id: r.rj.id.toString(),
      displayCode: r.rj.displayCode,
      fullName: r.rj.user.fullName,
      avatarUrl: r.rj.user.avatarUrl,
    },
    user: { id: r.user.id.toString(), fullName: r.user.fullName },
    reviewPreview: r.reviewText ? r.reviewText.slice(0, 120) : null,
    rating: r.rating,
    sentiment: r.sentiment,
    status: r.status,
    createdAt: r.createdAt,
  };
}

function serializeDetail(r) {
  return {
    id: r.id.toString(),
    rj: {
      id: r.rj.id.toString(),
      displayCode: r.rj.displayCode,
      fullName: r.rj.user.fullName,
      avatarUrl: r.rj.user.avatarUrl,
    },
    user: { id: r.user.id.toString(), fullName: r.user.fullName },
    callSession: r.callSession
      ? { id: r.callSession.id.toString(), startedAt: r.callSession.startedAt, durationSecs: r.callSession.durationSecs }
      : null,
    rating: r.rating,
    reviewText: r.reviewText,
    sentiment: r.sentiment,
    status: r.status,
    moderatedByName: r.moderatedBy?.fullName || null,
    moderatedAt: r.moderatedAt,
    createdAt: r.createdAt,
  };
}

async function listReviews(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [{ reviews, total }, stats] = await Promise.all([
    repo.listReviews({
      page, limit,
      search: query.search,
      rating: query.rating ? Number(query.rating) : undefined,
      sentiment: query.sentiment,
      status: query.status || "published", // "Published" is the default filter shown in Figma
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    }),
    repo.getStats(),
  ]);

  return {
    reviews: reviews.map(serializeListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getReviewById(id) {
  const r = await repo.findById(id);
  if (!r) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found");
  return serializeDetail(r);
}

// Submitted by the male User's app after a call ends — validated against
// the call session belonging to that user/RJ pair at the controller/route
// layer via user-auth, not admin-auth.
async function submitReview({ rjId, userId, callSessionId, rating, reviewText }) {
  const created = await repo.createReview({
    rjId: BigInt(rjId),
    userId: BigInt(userId),
    callSessionId: callSessionId ? BigInt(callSessionId) : null,
    rating,
    reviewText: reviewText || null,
    sentiment: sentimentFromRating(rating),
    status: "published",
  });

  await repo.recalculateRJAvgRating(rjId);

  return serializeDetail(await repo.findById(created.id));
}

// Moderation actions: flag / remove / restore
async function moderate(id, action, moderatedById) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found");

  const statusMap = { flag: "flagged", remove: "removed", restore: "published" };
  const newStatus = statusMap[action];
  if (!newStatus) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid moderation action");

  const updated = await repo.updateStatus(id, {
    status: newStatus,
    moderatedById: BigInt(moderatedById),
    moderatedAt: new Date(),
  });

  await repo.recalculateRJAvgRating(updated.rjId);

  return serializeDetail(await repo.findById(updated.id));
}

module.exports = {
  listReviews,
  getReviewById,
  submitReview,
  moderate,
};