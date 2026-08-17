// src/modules/rj/profile/rj.service.js
const crypto = require("crypto");
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const { ONLINE_THRESHOLD_MINUTES } = require("./rj.constants");
const repo = require("./rj.repository");
const usersRepo = require("../../users/users.repository");

// RJ-8842 style, matching the Figma badge
function generateDisplayCode() {
  return `RJ-${crypto.randomInt(1000, 9999)}`;
}

// Same active-vs-online distinction as users.service.js: `status` field on
// RJ is real-time presence (online/offline/busy/on_call), separately from
// account moderation state which lives on the underlying User.status.
function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  const thresholdMs = ONLINE_THRESHOLD_MINUTES * 60 * 1000;
  return Date.now() - new Date(lastActiveAt).getTime() < thresholdMs;
}

function serializeRJ(rj) {
  return {
    id: rj.id.toString(),
    publicId: rj.publicId,
    displayCode: rj.displayCode,
    userId: rj.user.id.toString(),
    fullName: rj.user.fullName,
    email: rj.user.email,
    mobileCountryCode: rj.user.mobileCountryCode,
    mobileNumber: rj.user.mobileNumber,
    avatarUrl: rj.user.avatarUrl,
    city: rj.user.city,
    state: rj.user.state,
    country: rj.user.country,
    languages: rj.user.languages?.map((l) => l.language.name) || undefined,
    bio: rj.user.bio, // ← was rj.bio (field doesn't exist on RJ), now reads from the underlying User
    tier: rj.tier,
    status: rj.status,
    isOnline: isOnline(rj.lastActiveAt),
    verificationStatus: rj.verificationStatus,
    verifiedAt: rj.verifiedAt,
    verifiedByName: rj.verifiedBy?.fullName || null,
    experienceYears: rj.experienceYears,
    commissionRate: rj.commissionRate,
    avgRating: rj.avgRating,
    totalCallsCount: rj.totalCallsCount,
    avgResponseSeconds: rj.avgResponseSeconds,
    categories: rj.categories?.map((c) => c.category.name) || undefined,
    wallet: rj.wallet ? { balance: rj.wallet.balance } : null,
    badges: rj.badges?.map((b) => ({ name: b.badgeName, awardedAt: b.awardedAt })) || undefined,
    recentStatusHistory: rj.statusHistory?.map((h) => ({
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    approvedAt: rj.approvedAt,
    lastActiveAt: rj.lastActiveAt,
  };
}

async function assertCategoriesExist(categoryIds) {
  const found = await repo.findCategoriesByIds(categoryIds);
  if (found.length !== categoryIds.length) {
    const foundIds = found.map((c) => c.id);
    const missing = categoryIds.filter((id) => !foundIds.includes(id));
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown category id(s): ${missing.join(", ")}`);
  }
}

async function listRJs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const sortBy = query.sortBy || "approvedAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);

  const { rjs, total } = await repo.listRJs({
    page,
    limit,
    search: query.search,
    status: query.status,
    verificationStatus: query.verificationStatus,
    tier: query.tier,
    categoryId: query.categoryId ? Number(query.categoryId) : undefined,
    onlineOnly: query.onlineOnly,
    onlineThreshold,
    sortBy,
    sortOrder,
  });

  return {
    rjs: rjs.map(serializeRJ),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getRJById(id) {
  const rj = await repo.findById(id);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");
  return serializeRJ(rj);
}

// Called from the RJApplication approval flow — the applicant must already
// be a registered (female) User; this just promotes her to RJ.
async function createFromApplication({ userId, applicationId, categoryId, experienceYears, createdById }) {
  const user = await usersRepo.findById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const existingRJ = await repo.findByUserId(userId);
  if (existingRJ) throw new ApiError(HTTP_STATUS.CONFLICT, "This user is already an RJ");

  if (categoryId) await assertCategoriesExist([categoryId]);

  const created = await repo.createFromApplication({
    userId,
    displayCode: generateDisplayCode(),
    applicationId,
    categoryId,
    experienceYears,
    createdById,
  });

  const rj = await repo.findById(created.id);
  return serializeRJ(rj);
}

// updateRJ — bio now needs to be routed to usersRepo.updateUser, not
// repo.updateRJ, since it's a User column, not an RJ column. Everything
// else (tier, experienceYears, commissionRate, categoryIds) still goes
// through the RJ update path as before.
async function updateRJ(id, updates, updatedById) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const { categoryIds, bio, ...profileFields } = updates;

  if (categoryIds) {
    await assertCategoriesExist(categoryIds);
    await repo.setCategories(id, categoryIds);
  }

  if (bio !== undefined) {
    await usersRepo.updateUser(existing.user.id, { bio });
  }

  await repo.updateRJ(id, {
    ...profileFields,
    updatedById: updatedById ? BigInt(updatedById) : null,
  });

  const rj = await repo.findById(id);
  return serializeRJ(rj);
}

// Account moderation (active/inactive/suspended/blocked) — mirrors
// users.service.js changeStatus exactly, logged to RJStatusHistory.
async function changeAccountStatus(id, { status, reason }, changedById) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  // Account status is stored on the underlying User (single source of truth
  // for suspension/blocking across the whole platform).
  await usersRepo.updateStatus(existing.userId, status);

  await repo.createStatusHistory({
    rjId: existing.id,
    previousStatus: existing.user.status,
    newStatus: status,
    reason: reason || null,
    changedById,
  });

  const rj = await repo.findById(id);
  return serializeRJ(rj);
}

// Real-time presence (online/offline/busy/on_call) — set by the mobile app
// via Socket.io events, or an admin forcing an RJ offline.
async function changePresenceStatus(id, status, changedById) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const rj = await repo.updatePresenceStatus(id, status);
  return serializeRJ(await repo.findById(rj.id));
}

async function deleteRJ(id) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  await repo.softDeleteRJ(id);
}

async function addNote(id, note, adminId) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const created = await repo.createNote({ rjId: id, adminId, note });

  return {
    id: created.id.toString(),
    note: created.note,
    adminName: created.admin.fullName,
    createdAt: created.createdAt,
  };
}

async function listNotes(id) {
  const notes = await repo.listNotes(id);
  return notes.map((n) => ({
    id: n.id.toString(),
    note: n.note,
    adminName: n.admin.fullName,
    createdAt: n.createdAt,
  }));
}

module.exports = {
  listRJs,
  getRJById,
  createFromApplication,
  updateRJ,
  changeAccountStatus,
  changePresenceStatus,
  deleteRJ,
  addNote,
  listNotes,
};