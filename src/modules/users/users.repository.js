// src/modules/users/users.repository.js
const { prisma } = require("../../config/database");

function buildWhere({ search, status, verificationStatus, onlineOnly, onlineThreshold }) {
  const where = { deletedAt: null };

  if (status) where.status = status;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (onlineOnly) where.lastActiveAt = { gte: onlineThreshold };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search } },
      { displayCode: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

async function listUsers({ page, limit, search, status, verificationStatus, onlineOnly, onlineThreshold, sortBy, sortOrder }) {
  const where = buildWhere({ search, status, verificationStatus, onlineOnly, onlineThreshold });
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { currentSubscription: true, wallet: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

function findById(id) {
  return prisma.user.findUnique({
    where: { id: BigInt(id) },
    include: {
      currentSubscription: true,
      wallet: true,
      languages: { include: { language: true } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 5 },
      verifiedBy: { select: { fullName: true } },
    },
  });
}

function findByMobile(mobileCountryCode, mobileNumber) {
  return prisma.user.findUnique({
    where: { uq_users_mobile: { mobileCountryCode, mobileNumber } },
  });
}

function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

function findLanguagesByIds(ids) {
  return prisma.language.findMany({ where: { id: { in: ids } } });
}

function createUser(data) {
  return prisma.user.create({ data, include: { currentSubscription: true, wallet: true } });
}

// Replaces a user's language set entirely — deletes existing links then
// inserts the new ones, in one transaction so it's never half-applied.
async function setUserLanguages(userId, languageIds) {
  if (!languageIds) return;

  await prisma.$transaction([
    prisma.userLanguage.deleteMany({ where: { userId: BigInt(userId) } }),
    prisma.userLanguage.createMany({
      data: languageIds.map((languageId, index) => ({
        userId: BigInt(userId),
        languageId,
        isPrimary: index === 0, // first one in the array is treated as primary
      })),
      skipDuplicates: true,
    }),
  ]);
}

function updateUser(id, data) {
  return prisma.user.update({
    where: { id: BigInt(id) },
    data,
    include: { currentSubscription: true, wallet: true },
  });
}

function softDeleteUser(id) {
  return prisma.user.update({
    where: { id: BigInt(id) },
    data: { deletedAt: new Date() },
  });
}

function updateStatus(id, status) {
  return prisma.user.update({
    where: { id: BigInt(id) },
    data: { status },
    include: { currentSubscription: true, wallet: true },
  });
}

function updateVerificationStatus(id, verificationStatus, verifiedById) {

  const data = {
    verificationStatus,
  };

  if (verificationStatus === "verified") {
    data.verifiedAt = new Date();
    data.verifiedById = verifiedById
      ? BigInt(verifiedById)
      : null;
  } else {
    data.verifiedAt = null;
    data.verifiedById = null;
  }

  return prisma.user.update({
    where: {
      id: BigInt(id),
    },
    data,
    include: {
      currentSubscription: true,
      wallet: true,
      verifiedBy: {
        select: {
          fullName: true,
        },
      },
    },
  });

}

function createStatusHistory({ userId, previousStatus, newStatus, reason, changedById }) {
  return prisma.userStatusHistory.create({
    data: { userId, previousStatus, newStatus, reason, changedById },
  });
}

function createNote({ userId, adminId, note }) {
  return prisma.adminNote.create({
    data: { userId, adminId, note },
    include: { admin: { select: { fullName: true } } },
  });
}

function listNotes(userId) {
  return prisma.adminNote.findMany({
    where: { userId: BigInt(userId), deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { admin: { select: { fullName: true } } },
  });
}

module.exports = {
  listUsers,
  findById,
  findByMobile,
  findByEmail,
  findLanguagesByIds,
  createUser,
  setUserLanguages,
  updateUser,
  softDeleteUser,
  updateStatus,
  updateVerificationStatus,
  createStatusHistory,
  createNote,
  listNotes,
};