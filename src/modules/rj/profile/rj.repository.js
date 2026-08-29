// src/modules/rj/profile/rj.repository.js
const { prisma } = require("../../../config/database");

function buildWhere({ search, status, verificationStatus, tier, categoryId, onlineOnly, onlineThreshold }) {
  const where = { deletedAt: null };

  if (status) where.status = status;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (tier) where.tier = tier;
  if (onlineOnly) where.lastActiveAt = { gte: onlineThreshold };
  if (categoryId) where.categories = { some: { categoryId } };

  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
      { user: { mobileNumber: { contains: search } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

const profileInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      mobileCountryCode: true,
      mobileNumber: true,
      avatarUrl: true,
      bio: true,          // ← added, was missing
      status: true,       // ← added, was missing (needed for account-status history)
      city: true,
      state: true,
      country: true,
      languages: { include: { language: true } },
    },
  },
  categories: { include: { category: true } },
  wallet: true,
  verifiedBy: { select: { fullName: true } },
};

async function listRJs({ page, limit, search, status, verificationStatus, tier, categoryId, onlineOnly, onlineThreshold, sortBy, sortOrder }) {
  const where = buildWhere({ search, status, verificationStatus, tier, categoryId, onlineOnly, onlineThreshold });
  const skip = (page - 1) * limit;

  const [rjs, total] = await prisma.$transaction([
    prisma.rJ.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: profileInclude,
    }),
    prisma.rJ.count({ where }),
  ]);

  return { rjs, total };
}

function findById(id) {
  return prisma.rJ.findUnique({
    where: { id: BigInt(id) },
    include: {
      ...profileInclude,
      statusHistory: { orderBy: { createdAt: "desc" }, take: 5 },
      badges: { orderBy: { awardedAt: "desc" } },
    },
  });
}

function findByUserId(userId) {
  return prisma.rJ.findUnique({
    where: { userId: BigInt(userId) },
    include: profileInclude,
  });
}

function findByDisplayCode(displayCode) {
  return prisma.rJ.findUnique({
    where: { displayCode },
    include: profileInclude,
  });
}

function findCategoriesByIds(ids) {
  return prisma.rJCategory.findMany({ where: { id: { in: ids } } });
}

// Creates the RJ row + wallet in one transaction — an RJ should never exist
// without a wallet, so this guarantees both or neither.
function createFromApplication({ userId, displayCode, applicationId, categoryId, experienceYears, createdById }) {
  return prisma.$transaction(async (tx) => {
    const rj = await tx.rJ.create({
      data: {
        userId: BigInt(userId),
        displayCode,
        currentAppId: applicationId ? BigInt(applicationId) : null,
        experienceYears: experienceYears || 0,
        verificationStatus: "verified",
        verifiedAt: new Date(),
        approvedAt: new Date(),
        createdById: createdById ? BigInt(createdById) : null,
      },
    });

    await tx.rJWallet.create({ data: { rjId: rj.id, balance: 0 } });

    if (categoryId) {
      await tx.rJCategoryMap.create({
        data: { rjId: rj.id, categoryId },
      });
    }

    await tx.rJActivityLog.create({
      data: { rjId: rj.id, eventType: "registered", description: "RJ profile created from approved application" },
    });

    return rj;
  });
}

async function setCategories(rjId, categoryIds) {
  if (!categoryIds) return;

  await prisma.$transaction([
    prisma.rJCategoryMap.deleteMany({ where: { rjId: BigInt(rjId) } }),
    prisma.rJCategoryMap.createMany({
      data: categoryIds.map((categoryId) => ({ rjId: BigInt(rjId), categoryId })),
      skipDuplicates: true,
    }),
  ]);
}

function updateRJ(id, data) {
  return prisma.rJ.update({
    where: { id: BigInt(id) },
    data,
    include: profileInclude,
  });
}

function softDeleteRJ(id) {
  return prisma.rJ.update({
    where: { id: BigInt(id) },
    data: { deletedAt: new Date() },
  });
}

// RJStatus (online/offline/busy/on_call) — real-time presence, not account state
function updatePresenceStatus(id, status) {
  return prisma.rJ.update({
    where: { id: BigInt(id) },
    data: { status, lastActiveAt: new Date() },
    include: profileInclude,
  });
}

function createStatusHistory({ rjId, previousStatus, newStatus, reason, changedById }) {
  return prisma.rJStatusHistory.create({
    data: { rjId: BigInt(rjId), previousStatus, newStatus, reason, changedById: changedById ? BigInt(changedById) : null },
  });
}

function createNote({ rjId, adminId, note }) {
  return prisma.rJAdminNote.create({
    data: { rjId: BigInt(rjId), adminId: BigInt(adminId), note },
    include: { admin: { select: { fullName: true } } },
  });
}

function listNotes(rjId) {
  return prisma.rJAdminNote.findMany({
    where: { rjId: BigInt(rjId), deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { admin: { select: { fullName: true } } },
  });
}

module.exports = {
  listRJs,
  findById,
  findByUserId,
  findByDisplayCode,
  findCategoriesByIds,
  createFromApplication,
  setCategories,
  updateRJ,
  softDeleteRJ,
  updatePresenceStatus,
  createStatusHistory,
  createNote,
  listNotes,
};