// src/modules/notifications/notification.repository.js
const { prisma } = require("../../config/database");
const { DEDUP_SECONDS } = require("./notification.constants");

const SENDER_SELECT = { id: true, publicId: true, fullName: true, avatarUrl: true };

// Suppresses a duplicate (same sender, receiver, type) within the dedup
// window instead of inserting a second row — mirrors the reference app's
// notificationModel.create() dedup check, done here via a normal date
// comparison rather than raw SQL INTERVAL syntax (no Postgres equivalent
// gotcha to work around the way the reference's MySQL/TiDB one did).
async function create(senderId, receiverId, type, message) {
  const since = new Date(Date.now() - DEDUP_SECONDS * 1000);

  const recent = await prisma.userNotification.findFirst({
    where: {
      senderId: BigInt(senderId),
      receiverId: BigInt(receiverId),
      type,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (recent) return recent;

  return prisma.userNotification.create({
    data: {
      senderId: BigInt(senderId),
      receiverId: BigInt(receiverId),
      type,
      message,
    },
  });
}

function listByUser(userId, { page, limit }) {
  const where = { receiverId: BigInt(userId) };
  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.userNotification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { sender: { select: SENDER_SELECT } },
    }),
    prisma.userNotification.count({ where }),
  ]);
}

function markAllRead(userId) {
  return prisma.userNotification.updateMany({
    where: { receiverId: BigInt(userId), isRead: false },
    data: { isRead: true },
  });
}

function unreadCount(userId) {
  return prisma.userNotification.count({
    where: { receiverId: BigInt(userId), isRead: false },
  });
}

// Used when a friend request is accepted/rejected/cancelled — the pending
// request's notification no longer means anything, so it's deleted rather
// than left to show a stale "sent you a friend request" in the feed.
function deleteByTypeAndPair(senderId, receiverId, type) {
  return prisma.userNotification.deleteMany({
    where: { senderId: BigInt(senderId), receiverId: BigInt(receiverId), type },
  });
}

module.exports = { create, listByUser, markAllRead, unreadCount, deleteByTypeAndPair };