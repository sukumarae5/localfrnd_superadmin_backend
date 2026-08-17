// src/modules/moderation/moderation.repository.js
const { prisma } = require("../../config/database");
const { BLOCKED_STATUSES } = require("./moderation.constants");

function buildWhere({ search, blockType, reason, appealStatus }) {
  const where = { deletedAt: null, status: { in: BLOCKED_STATUSES } };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { displayCode: { contains: search, mode: "insensitive" } },
    ];
  }

  // blockType / reason / appealStatus all live on the UserStatusHistory row
  // that caused the block, not on User directly, so we filter through the
  // relation. This assumes the block-causing row is still the user's most
  // recent status change, which holds as long as they haven't been
  // unblocked (in which case they wouldn't be in BLOCKED_STATUSES anyway).
  if (blockType || reason || appealStatus) {
    where.statusHistory = {
      some: {
        newStatus: { in: BLOCKED_STATUSES },
        ...(blockType ? { blockType } : {}),
        ...(reason ? { reason: { contains: reason, mode: "insensitive" } } : {}),
        ...(appealStatus ? { appeals: { some: { status: appealStatus } } } : {}),
      },
    };
  }

  return where;
}

async function listBlockedUsers({ page, limit, search, blockType, reason, appealStatus, dateFrom, dateTo }) {
  const where = buildWhere({ search, blockType, reason, appealStatus });
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        // Most recent status change is assumed to be the block itself —
        // see the note in buildWhere.
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            changedBy: { select: { fullName: true } },
            appeals: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // dateFrom/dateTo filter on block date — applied post-query since it's a
  // filter on the included relation's field, not User itself. Fine at
  // moderation-list volumes; move into buildWhere with a raw query if this
  // table grows very large.
  const filtered =
    dateFrom || dateTo
      ? users.filter((u) => {
          const blockedAt = u.statusHistory[0]?.createdAt;
          if (!blockedAt) return false;
          if (dateFrom && blockedAt < dateFrom) return false;
          if (dateTo && blockedAt > dateTo) return false;
          return true;
        })
      : users;

  return { users: filtered, total };
}

async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalBlocked, temporarilySuspended, permanentlyBanned, blockedToday] = await prisma.$transaction([
    prisma.user.count({ where: { deletedAt: null, status: { in: BLOCKED_STATUSES } } }),
    prisma.user.count({ where: { deletedAt: null, status: "suspended" } }),
    prisma.user.count({
      where: {
        deletedAt: null,
        status: "blocked",
        statusHistory: { some: { newStatus: "blocked", blockType: "permanent" } },
      },
    }),
    prisma.userStatusHistory.count({
      where: { newStatus: { in: BLOCKED_STATUSES }, createdAt: { gte: startOfToday } },
    }),
  ]);

  return { totalBlocked, temporarilySuspended, permanentlyBanned, blockedToday };
}

function findUserDetail(userId) {
  return prisma.user.findUnique({
    where: { id: BigInt(userId) },
    include: {
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: {
          changedBy: { select: { fullName: true } },
          appeals: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
}

// The specific status-history row currently responsible for the user being
// blocked — this is what "Update Block" edits and what appeals attach to.
function findLatestBlock(userId) {
  return prisma.userStatusHistory.findFirst({
    where: { userId: BigInt(userId), newStatus: { in: BLOCKED_STATUSES } },
    orderBy: { createdAt: "desc" },
  });
}

function findStatusHistoryById(id) {
  return prisma.userStatusHistory.findUnique({ where: { id: BigInt(id) } });
}

function updateBlockFields(statusHistoryId, data) {
  return prisma.userStatusHistory.update({
    where: { id: BigInt(statusHistoryId) },
    data,
  });
}

function findAppealById(appealId) {
  return prisma.userAppeal.findUnique({
    where: { id: BigInt(appealId) },
    include: {
      user: { select: { id: true, fullName: true, displayCode: true, status: true } },
      statusHistory: true,
    },
  });
}

function updateAppealDecision(appealId, data) {
  return prisma.userAppeal.update({
    where: { id: BigInt(appealId) },
    data,
  });
}

// For the mobile-app side — see routing note at the bottom of this module.
function createAppeal({ userId, statusHistoryId, message }) {
  return prisma.userAppeal.create({
    data: { userId: BigInt(userId), statusHistoryId: BigInt(statusHistoryId), message },
  });
}

module.exports = {
  listBlockedUsers,
  getStats,
  findUserDetail,
  findLatestBlock,
  findStatusHistoryById,
  updateBlockFields,
  findAppealById,
  updateAppealDecision,
  createAppeal,
};