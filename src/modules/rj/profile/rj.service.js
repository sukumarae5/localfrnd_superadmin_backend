
const crypto = require("crypto");
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const { ONLINE_THRESHOLD_MINUTES } = require("./rj.constants");
const repo = require("./rj.repository");
const usersRepo = require("../../users/users.repository");
const presenceService = require("../../../socket/presence.service");

// Generate RJ display code.
function generateDisplayCode() {
  return `RJ-${crypto.randomInt(1000, 9999)}`;
}

// Check real-time RJ presence using Socket.IO presence service.
function isOnline(rjId) {
  return presenceService.isOnlineSync("rj", rjId);
}

// Convert RJ database record into API response.
function serializeRJ(rj) {
  if (!rj) return null;

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

    languages:
      rj.user.languages?.map((l) => l.language.name) || undefined,

    bio: rj.user.bio,

    tier: rj.tier,
    status: rj.status,
    isOnline: isOnline(rj.id),

    verificationStatus: rj.user.verificationStatus,
    verifiedAt: rj.user.verifiedAt,
    verifiedByName: rj.user.verifiedBy?.fullName || null,

    experienceYears: rj.experienceYears,
    commissionRate: rj.commissionRate,
    avgRating: rj.avgRating,
    totalCallsCount: rj.totalCallsCount,
    avgResponseSeconds: rj.avgResponseSeconds,

    categories:
      rj.categories?.map((c) => c.category.name) || undefined,

    wallet: rj.wallet
      ? { balance: rj.wallet.balance }
      : null,

    badges:
      rj.badges?.map((b) => ({
        name: b.badgeName,
        awardedAt: b.awardedAt,
      })) || undefined,

    recentStatusHistory:
      rj.statusHistory?.map((h) => ({
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        createdAt: h.createdAt,
      })),

    approvedAt: rj.approvedAt,
    lastActiveAt: rj.lastActiveAt,
  };
}

// Validate RJ category IDs.
async function assertCategoriesExist(categoryIds) {
  const found = await repo.findCategoriesByIds(categoryIds);

  if (found.length !== categoryIds.length) {
    const foundIds = found.map((c) => c.id);

    const missing = categoryIds.filter(
      (id) => !foundIds.includes(id)
    );

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Unknown category id(s): ${missing.join(", ")}`
    );
  }
}

// List RJs with pagination and filters.
async function listRJs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const sortBy = query.sortBy || "approvedAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const onlineThreshold = new Date(
    Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000
  );

  const { rjs, total } = await repo.listRJs({
    page,
    limit,
    search: query.search,
    status: query.status,
    verificationStatus: query.verificationStatus,
    tier: query.tier,
    categoryId: query.categoryId
      ? Number(query.categoryId)
      : undefined,
    onlineOnly: query.onlineOnly,
    onlineThreshold,
    sortBy,
    sortOrder,
  });

  return {
    rjs: rjs.map(serializeRJ),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Get RJ details by RJ ID.
async function getRJById(id) {
  const rj = await repo.findById(id);

  if (!rj || rj.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  return serializeRJ(rj);
}

// Automatically create RJ when a female user completes profile.
async function autoCreateIfEligible(userId, createdById) {
  const existingRJ = await repo.findByUserId(userId);

  if (existingRJ) return null;

  const created = await repo.createAutoApproved({
    userId,
    displayCode: generateDisplayCode(),
    createdById,
  });

  const rj = await repo.findById(created.id);

  return serializeRJ(rj);
}

// Create RJ from an approved application.
async function createFromApplication({
  userId,
  applicationId,
  categoryId,
  experienceYears,
  createdById,
}) {
  const existingRJ = await repo.findByUserId(userId);

  if (existingRJ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "RJ profile already exists for this user"
    );
  }

  const created = await repo.createFromApplication({
    userId,
    displayCode: generateDisplayCode(),
    applicationId,
    categoryId,
    experienceYears,
    createdById,
  });

  // Automatically verify linked User after RJ creation.
  await usersRepo.markAutomaticallyVerified(userId);

  const rj = await repo.findById(created.id);

  return serializeRJ(rj);
}

// Update RJ profile.
async function updateRJ(id, updates, updatedById) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  const { categoryIds, bio, ...profileFields } = updates;

  // Update RJ categories.
  if (categoryIds) {
    await assertCategoriesExist(categoryIds);

    await repo.setCategories(id, categoryIds);
  }

  // Bio belongs to User table, not RJ table.
  if (bio !== undefined) {
    await usersRepo.updateUser(existing.user.id, {
      bio,
      updatedById: updatedById
        ? BigInt(updatedById)
        : null,
    });
  }

  // Update RJ-specific fields.
  await repo.updateRJ(id, {
    ...profileFields,
    updatedById: updatedById
      ? BigInt(updatedById)
      : null,
  });

  // Automatically verify linked User.
  await usersRepo.markAutomaticallyVerified(existing.userId);

  const updatedRJ = await repo.findById(id);

  return serializeRJ(updatedRJ);
}

// Change RJ account moderation status.
// Account status is maintained in User table.
async function changeAccountStatus(
  id,
  { status, reason },
  changedById
) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  // Update underlying User status.
  await usersRepo.updateStatus(existing.userId, status);

  // Record RJ status history.
  await repo.createStatusHistory({
    rjId: existing.id,
    previousStatus: existing.user.status || "active",
    newStatus: status,
    reason: reason || null,
    changedById,
  });

  const rj = await repo.findById(id);

  return serializeRJ(rj);
}

// Update RJ verification status.
// Verification is stored in User table.
async function updateVerification(
  id,
  verificationStatus,
  adminId
) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  if (
    existing.user.verificationStatus === verificationStatus
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `RJ is already ${verificationStatus}`
    );
  }

  await usersRepo.updateVerificationStatus(
    existing.userId,
    verificationStatus,
    adminId
  );

  const updatedRJ = await repo.findById(id);

  return serializeRJ(updatedRJ);
}

// Change real-time RJ presence status.
async function changePresenceStatus(
  id,
  status,
  changedById
) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  const rj = await repo.updatePresenceStatus(id, status);

  return serializeRJ(await repo.findById(rj.id));
}

// Soft delete RJ.
async function deleteRJ(id) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  await repo.softDeleteRJ(id);
}

// Add admin note to RJ profile.
async function addNote(id, note, adminId) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "RJ not found"
    );
  }

  const created = await repo.createNote({
    rjId: id,
    adminId,
    note,
  });

  return {
    id: created.id.toString(),
    note: created.note,
    adminName: created.admin.fullName,
    createdAt: created.createdAt,
  };
}

// Get RJ admin notes.
async function listNotes(id) {
  const notes = await repo.listNotes(id);

  return notes.map((n) => ({
    id: n.id.toString(),
    note: n.note,
    adminName: n.admin.fullName,
    createdAt: n.createdAt,
  }));
}

// Export service functions.
module.exports = {
  listRJs,
  getRJById,
  autoCreateIfEligible,
  createFromApplication,
  updateRJ,
  changeAccountStatus,
  updateVerification,
  changePresenceStatus,
  deleteRJ,
  addNote,
  listNotes,
};
