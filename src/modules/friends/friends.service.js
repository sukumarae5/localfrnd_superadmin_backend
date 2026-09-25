// src/modules/friends/friends.service.js
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./friends.repository");
const notificationService = require("../notifications/notification.service");
const { NOTIFICATION_TYPES } = require("../notifications/notification.constants");

// Lazy require, same reasoning as presence.service.js's getIOSafe(): avoids
// requiring socket/io.js before it has finished registering its own
// module.exports at startup. Called well after startup on every real
// request, so the circular-require footgun never actually bites here.
function getIOSafe() {
  try {
    return require("../../socket/io").getIO();
  } catch (_) {
    return null;
  }
}

// The social layer only ever knows about User.id — see social.prisma's
// header comment. Both authenticateUser and authenticateRJ set req.user.id
// to the same underlying User row, and presence.socket.js joins an RJ's
// socket to `user:<userId>` in addition to `rj:<rjId>` for exactly this
// reason, so this room always reaches whoever is on the other end.
function emitToUser(userId, event, payload) {
  const io = getIOSafe();
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function serializeUserSummary(user) {
  if (!user) return null;
  return {
    userId: user.id.toString(),
    publicId: user.publicId,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  };
}

function counterpartOf(friendship, meId) {
  const me = BigInt(meId);
  const other = friendship.userId1 === me ? friendship.user2 : friendship.user1;
  return serializeUserSummary(other);
}

function serializeFriendship(friendship, meId) {
  return {
    requestPublicId: friendship.publicId,
    status: friendship.status,
    friend: counterpartOf(friendship, meId),
    createdAt: friendship.createdAt,
    updatedAt: friendship.updatedAt,
  };
}

async function sendRequest(fromUserId, toUserId) {
  if (String(fromUserId) === String(toUserId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "You can't friend-request yourself");
  }

  const target = await repo.findUserSummary(toUserId);
  if (!target || target.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const existing = await repo.findByPair(fromUserId, toUserId);

  if (existing) {
    if (existing.status === "accepted") {
      throw new ApiError(HTTP_STATUS.CONFLICT, "You're already friends");
    }
    // Both sides requested each other at (about) the same time — treat it
    // as an instant match instead of making the second sender see a
    // conflict error for something that's actually good news.
    if (existing.requestedById !== BigInt(fromUserId)) {
      const accepted = await repo.acceptRequest(existing.publicId, fromUserId);
      await notificationService.deleteFriendRequestNotification(fromUserId, toUserId);
      await notificationService.createNotification(
        fromUserId, toUserId, NOTIFICATION_TYPES.FRIEND_ACCEPT, "Accepted your friend request"
      );
      emitToUser(toUserId, "friend:accepted", { requestPublicId: accepted.publicId });
      emitToUser(toUserId, "notification:new", {});
      return { matched: true, ...serializeFriendship(accepted, fromUserId) };
    }
    throw new ApiError(HTTP_STATUS.CONFLICT, "Request already sent");
  }

  const created = await repo.createRequest(fromUserId, toUserId);
  await notificationService.createNotification(
    fromUserId, toUserId, NOTIFICATION_TYPES.FRIEND_REQUEST, "Sent you a friend request"
  );
  emitToUser(toUserId, "friend:request", { requestPublicId: created.publicId, fromUserId: String(fromUserId) });
  emitToUser(toUserId, "notification:new", {});

  return { matched: false, requestPublicId: created.publicId, status: created.status };
}

async function acceptRequest(requestPublicId, accepterUserId) {
  const pending = await repo.findPendingByPublicId(requestPublicId);
  if (!pending) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Request not found");

  const accepted = await repo.acceptRequest(requestPublicId, accepterUserId);
  if (!accepted) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No pending request to accept");

  const requesterId = pending.requestedById.toString();
  await notificationService.deleteFriendRequestNotification(requesterId, accepterUserId);
  await notificationService.createNotification(
    accepterUserId, requesterId, NOTIFICATION_TYPES.FRIEND_ACCEPT, "Accepted your friend request"
  );
  emitToUser(requesterId, "friend:accepted", { requestPublicId: accepted.publicId });
  emitToUser(requesterId, "notification:new", {});

  return serializeFriendship(accepted, accepterUserId);
}

async function rejectRequest(requestPublicId, rejecterUserId) {
  const pending = await repo.findPendingByPublicId(requestPublicId);
  if (!pending) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Request not found");

  const rejected = await repo.rejectRequest(requestPublicId, rejecterUserId);
  if (!rejected) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No pending request to reject");

  const requesterId = pending.requestedById.toString();
  await notificationService.deleteFriendRequestNotification(requesterId, rejecterUserId);
  emitToUser(requesterId, "friend:rejected", { requestPublicId });

  return { success: true };
}

async function cancelRequest(requestPublicId, senderUserId) {
  const pending = await repo.findPendingByPublicId(requestPublicId);
  if (!pending) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Request not found");

  const cancelled = await repo.cancelRequest(requestPublicId, senderUserId);
  if (!cancelled) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No pending request to cancel");

  const receiverId = (cancelled.userId1 === BigInt(senderUserId) ? cancelled.userId2 : cancelled.userId1).toString();
  await notificationService.deleteFriendRequestNotification(senderUserId, receiverId);
  emitToUser(receiverId, "friend:request_cancelled", { requestPublicId });

  return { success: true };
}

async function listFriends(userId) {
  const friendships = await repo.listAccepted(userId);
  return friendships.map((f) => serializeFriendship(f, userId));
}

async function listPendingReceived(userId) {
  const friendships = await repo.listPendingReceived(userId);
  return friendships.map((f) => ({
    requestPublicId: f.publicId,
    from: serializeUserSummary(f.requestedBy),
    createdAt: f.createdAt,
  }));
}

async function listPendingSent(userId) {
  const friendships = await repo.listPendingSent(userId);
  return friendships.map((f) => serializeFriendship(f, userId));
}

async function getStatus(meId, otherId) {
  if (String(meId) === String(otherId)) return { state: "SELF" };

  const friendship = await repo.findByPair(meId, otherId);
  if (!friendship) return { state: "NONE" };

  if (friendship.status === "accepted") return { state: "FRIEND", requestPublicId: friendship.publicId };

  return friendship.requestedById === BigInt(meId)
    ? { state: "PENDING_SENT", requestPublicId: friendship.publicId }
    : { state: "PENDING_RECEIVED", requestPublicId: friendship.publicId };
}

async function unfriend(meId, otherId) {
  const removed = await repo.removeFriendship(meId, otherId);
  if (!removed) throw new ApiError(HTTP_STATUS.NOT_FOUND, "You're not friends with this user");

  emitToUser(otherId, "friend:removed", { by: String(meId) });
  return { success: true };
}

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  listFriends,
  listPendingReceived,
  listPendingSent,
  getStatus,
  unfriend,
};