// src/modules/moderation/moderation.service.js
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./moderation.repository");
const usersRepo = require("../users/users.repository"); // reused for the unblock transition

function blockedByName(historyRow) {
  if (historyRow.blockedByType === "system") return "Auto-Mod (AI)";
  return historyRow.changedBy?.fullName || "Unknown";
}

function serializeBlockedUser(user) {
  const block = user.statusHistory[0];
  const appeal = block?.appeals?.[0];

  return {
    id: user.id.toString(),
    publicId: user.publicId,
    displayCode: user.displayCode,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    status: user.status,
    blockType: block?.blockType || null,
    reason: block?.reason || null,
    blockDate: block?.createdAt || null,
    expiresAt: block?.expiresAt || null,
    blockedByType: block?.blockedByType || null,
    blockedByName: block ? blockedByName(block) : null,
    appealStatus: appeal?.status || null,
  };
}

function serializeTimelineEntry(h) {
  return {
    id: h.id.toString(),
    previousStatus: h.previousStatus,
    newStatus: h.newStatus,
    reason: h.reason,
    blockType: h.blockType,
    expiresAt: h.expiresAt,
    blockedByType: h.blockedByType,
    changedByName: blockedByName(h),
    createdAt: h.createdAt,
    appeal: h.appeals?.[0]
      ? {
          id: h.appeals[0].id.toString(),
          message: h.appeals[0].message,
          status: h.appeals[0].status,
          reviewedAt: h.appeals[0].reviewedAt,
        }
      : null,
  };
}

async function listBlockedUsers(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [{ users, total }, stats] = await Promise.all([
    repo.listBlockedUsers({
      page,
      limit,
      search: query.search,
      blockType: query.blockType,
      reason: query.reason,
      appealStatus: query.appealStatus,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    }),
    repo.getStats(),
  ]);

  return {
    users: users.map(serializeBlockedUser),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getModerationDetail(userId) {
  const user = await repo.findUserDetail(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const timeline = user.statusHistory.map(serializeTimelineEntry);
  const currentBlock = timeline.find((t) => ["blocked", "suspended"].includes(t.newStatus)) || null;

  return {
    user: {
      id: user.id.toString(),
      publicId: user.publicId,
      displayCode: user.displayCode,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      status: user.status,
    },
    currentBlock,
    timeline,
  };
}

// Edits the parameters of an existing block (type/expiry/reason) without
// creating a new status transition — this is the "Update Block" button,
// distinct from unblocking.
async function updateBlock(userId, updates, adminId) {
  const user = await usersRepo.findById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  if (!["blocked", "suspended"].includes(user.status)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "User is not currently blocked or suspended");
  }

  const block = await repo.findLatestBlock(userId);
  if (!block) throw new ApiError(HTTP_STATUS.NOT_FOUND, "No active block record found for this user");

  await repo.updateBlockFields(block.id, {
    blockType: updates.blockType ?? undefined,
    expiresAt: updates.expiresAt === null ? null : updates.expiresAt ? new Date(updates.expiresAt) : undefined,
    reason: updates.reason ?? undefined,
  });

  return getModerationDetail(userId);
}

// Lifts a block/suspension — records it as a new status transition (to
// `active`) so it shows up in the timeline, same pattern as users.service's
// changeStatus.
async function unblockUser(userId, reason, adminId) {
  const user = await usersRepo.findById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  if (!["blocked", "suspended"].includes(user.status)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "User is not currently blocked or suspended");
  }

  await usersRepo.createStatusHistory({
    userId: user.id,
    previousStatus: user.status,
    newStatus: "active",
    reason: reason || "Unblocked by admin",
    changedById: adminId ? BigInt(adminId) : null,
  });
  await usersRepo.updateStatus(userId, "active");

  return getModerationDetail(userId);
}

async function decideAppeal(appealId, { status, reason }, adminId) {
  const appeal = await repo.findAppealById(appealId);
  if (!appeal) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Appeal not found");
  if (appeal.status !== "pending") {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Appeal is already ${appeal.status}`);
  }

  await repo.updateAppealDecision(appealId, {
    status,
    reviewedById: BigInt(adminId),
    reviewedAt: new Date(),
  });

  if (status === "accepted") {
    // Accepting an appeal lifts the block it was filed against.
    await unblockUser(appeal.userId, reason || "Appeal accepted", adminId);
  }

  return {
    id: appeal.id.toString(),
    status,
    userId: appeal.userId.toString(),
  };
}

// Lightweight audit export for the "Download Audit" button. Returns the
// full timeline as JSON for now — swap the controller's response for a
// PDF/CSV stream later if you want a literal file download; the query here
// won't need to change.
async function getAuditTrail(userId) {
  const detail = await getModerationDetail(userId);
  return {
    user: detail.user,
    generatedAt: new Date(),
    timeline: detail.timeline,
  };
}

module.exports = {
  listBlockedUsers,
  getModerationDetail,
  updateBlock,
  unblockUser,
  decideAppeal,
  getAuditTrail,
};