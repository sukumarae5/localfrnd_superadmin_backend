// src/modules/notifications/notifications.service.js
// DB-only, like the reference app's notificationService minus the FCM push
// (this project has no Firebase config yet — delivery is DB + Socket.IO).
// Socket emission is the caller's job (friends.service.js, chat.socket.js),
// same separation the reference app used: this module never touches `io`.
const repo = require("./notification.repository");
const { NOTIFICATION_TYPES } = require("./notification.constants");

function serializeNotification(n) {
  return {
    id: n.id.toString(),
    type: n.type,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt,
    sender: n.sender
      ? {
          userId: n.sender.id.toString(),
          publicId: n.sender.publicId,
          fullName: n.sender.fullName,
          avatarUrl: n.sender.avatarUrl,
        }
      : null,
  };
}

async function createNotification(senderId, receiverId, type, message) {
  return repo.create(senderId, receiverId, type, message);
}

async function listNotifications(userId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 30, 100);

  const [notifications, total] = await repo.listByUser(userId, { page, limit });

  return {
    notifications: notifications.map(serializeNotification),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function markAllRead(userId) {
  await repo.markAllRead(userId);
  return { success: true };
}

async function getUnreadCount(userId) {
  const unread = await repo.unreadCount(userId);
  return { unread };
}

async function deleteFriendRequestNotification(senderId, receiverId) {
  await repo.deleteByTypeAndPair(senderId, receiverId, NOTIFICATION_TYPES.FRIEND_REQUEST);
}

async function deleteMessageNotification(senderId, receiverId) {
  await repo.deleteByTypeAndPair(senderId, receiverId, NOTIFICATION_TYPES.MESSAGE);
}

module.exports = {
  createNotification,
  listNotifications,
  markAllRead,
  getUnreadCount,
  deleteFriendRequestNotification,
  deleteMessageNotification,
};