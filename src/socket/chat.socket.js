// src/socket/chat.socket.js
// Real-time half of the chat module. REST (src/modules/chat) handles
// history/list/delete; sending and read-receipts happen here, same split
// the reference app used. Contains no Prisma calls of its own — everything
// delegates to chat.service.js so REST and sockets can never disagree about
// what "sent"/"read"/"friends" means.
const chatService = require("../modules/chat/chat.service");
const notificationService = require("../modules/notifications/notification.service");
const { NOTIFICATION_TYPES } = require("../modules/notifications/notification.constants");

// otherUserId this socket's owner currently has open on screen, if any —
// used to decide whether a new message should count as "seen immediately"
// (both delivered AND read) versus just delivered. Per-process, in-memory,
// like the reference app's activeChats — fine at this project's current
// single-instance scale (see socket/io.js's scaling note).
const activeChats = new Map();

function myUserId(socket) {
  // Chat is User.id-keyed only (see social.prisma) — admins have no place
  // in it. Both "user" and "rj" identities carry userId (see
  // socketAuth.middleware.js).
  const { type, userId } = socket.identity;
  return type === "user" || type === "rj" ? userId : null;
}

function isReceiverConnected(io, receiverId) {
  const room = io.sockets.adapter.rooms.get(`user:${receiverId}`);
  return !!room && room.size > 0;
}

function previewFor(content) {
  return content.length > 60 ? `${content.slice(0, 60)}…` : content;
}

function registerChatHandlers(io) {
  io.on("connection", (socket) => {
    const myId = myUserId(socket);
    if (!myId) return; // admin socket — chat doesn't apply

    socket.on("chat_send", async ({ receiverId, content } = {}, ack) => {
      try {
        if (!receiverId) return ack?.({ error: "receiverId is required" });

        const { conversationId, message } = await chatService.sendMessage(myId, receiverId, content);

        const receiverConnected = isReceiverConnected(io, receiverId);
        const receiverViewingThisChat = activeChats.get(String(receiverId)) === String(myId);

        if (receiverConnected && receiverViewingThisChat) {
          // Seen immediately — mark read server-side too, so REST history
          // and the read-receipt agree with what both screens just showed.
          await chatService.markMessageRead(message.messageId, receiverId);
          const delivered = { ...message, isRead: true };
          io.to(`user:${receiverId}`).emit("chat_receive", delivered);
          io.to(`user:${myId}`).emit("chat_receive", delivered);
          io.to(`user:${myId}`).emit("chat_read_update", { messageId: message.messageId, readerId: String(receiverId) });
        } else if (receiverConnected) {
          const delivered = { ...message, isRead: false };
          io.to(`user:${receiverId}`).emit("chat_receive", delivered);
          io.to(`user:${myId}`).emit("chat_receive", delivered);
        } else {
          io.to(`user:${myId}`).emit("chat_receive", { ...message, isRead: false });
        }

        // Push an in-app notification unless the receiver is already
        // looking at this exact conversation — the live socket event above
        // already covers that case.
        if (!receiverViewingThisChat) {
          await notificationService.createNotification(
            myId, receiverId, NOTIFICATION_TYPES.MESSAGE, previewFor(message.content)
          );
          io.to(`user:${receiverId}`).emit("notification:new", {});
        }

        ack?.({ success: true, message });
      } catch (err) {
        socket.emit("chat_error", { message: err.message });
        ack?.({ error: err.message });
      }
    });

    socket.on("chat_read", async ({ messageId } = {}, ack) => {
      try {
        const { senderId } = await chatService.markMessageRead(messageId, myId);
        io.to(`user:${senderId}`).emit("chat_read_update", { messageId: String(messageId), readerId: String(myId) });
        ack?.({ success: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("chat_read_all", async ({ conversationId } = {}, ack) => {
      try {
        const { otherUserId, messageIds } = await chatService.markConversationRead(conversationId, myId);
        await notificationService.deleteMessageNotification(otherUserId, myId);
        io.to(`user:${otherUserId}`).emit("chat_read_all_update", { otherUserId: String(myId) });
        messageIds.forEach((id) => io.to(`user:${otherUserId}`).emit("chat_read_update", { messageId: id }));
        ack?.({ success: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // Client opens a chat screen with `otherUserId` — clears their unread
    // state and message notifications in one round trip.
    socket.on("chat_open", async ({ otherUserId } = {}, ack) => {
      try {
        if (!otherUserId) return ack?.({ error: "otherUserId is required" });

        activeChats.set(String(myId), String(otherUserId));

        const { conversationId, otherUserId: resolvedOtherId, messageIds } =
          await chatService.openConversation(myId, otherUserId);

        await notificationService.deleteMessageNotification(otherUserId, myId);
        socket.emit("notification_deleted");

        messageIds.forEach((id) => {
          io.to(`user:${resolvedOtherId}`).emit("chat_read_update", { messageId: id });
        });
        if (messageIds.length > 0) {
          io.to(`user:${resolvedOtherId}`).emit("chat_read_all_update", { otherUserId: String(myId) });
        }

        ack?.({ success: true, conversationId });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("chat_close", () => {
      activeChats.delete(String(myId));
    });

    socket.on("disconnect", () => {
      activeChats.delete(String(myId));
    });
  });
}

module.exports = { registerChatHandlers };