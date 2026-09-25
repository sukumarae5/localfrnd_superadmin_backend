// src/modules/chat/chat.service.js
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./chat.repository");
const { DEFAULT_MESSAGE_PAGE_SIZE, MAX_MESSAGE_PAGE_SIZE, MAX_MESSAGE_LENGTH } = require("./chat.constants");

function serializeUserSummary(user) {
  if (!user) return null;
  return { userId: user.id.toString(), publicId: user.publicId, fullName: user.fullName, avatarUrl: user.avatarUrl };
}

function serializeMessage(message, meId) {
  const readByOther = (message.reads || []).some((r) => r.userId !== BigInt(message.senderId));
  return {
    messageId: message.id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.senderId.toString(),
    content: message.content,
    sentAt: message.sentAt,
    // "is_read" only means something for a message I sent — mirrors the
    // reference app's semantics (delivered/read ticks are from the
    // sender's point of view).
    isRead: String(message.senderId) === String(meId) ? readByOther : undefined,
  };
}

// Called before allowing a socket to send, and before returning history —
// re-checked at each call site rather than cached, since a friendship can
// be broken mid-conversation.
async function assertFriends(userA, userB) {
  const allowed = await repo.areFriends(userA, userB);
  if (!allowed) throw new ApiError(HTTP_STATUS.FORBIDDEN, "You can only chat with friends");
}

async function sendMessage(senderId, receiverId, content) {
  const trimmed = (content || "").trim();
  if (!trimmed) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Message content is required");
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
  }

  await assertFriends(senderId, receiverId);

  const conversation = await repo.getOrCreateConversation(senderId, receiverId);
  const message = await repo.insertMessage(conversation.id, senderId, trimmed);

  return { conversationId: conversation.id, message: serializeMessage({ ...message, reads: [] }, senderId) };
}

async function getMessages(meId, otherUserId, query) {
  await assertFriends(meId, otherUserId);

  const limit = Math.min(Number(query.limit) || DEFAULT_MESSAGE_PAGE_SIZE, MAX_MESSAGE_PAGE_SIZE);
  const offset = Number(query.offset) || 0;

  const conversation = await repo.getOrCreateConversation(meId, otherUserId);
  const messages = await repo.getMessages(conversation.id, { limit, offset });

  return {
    conversationId: conversation.id.toString(),
    messages: messages.reverse().map((m) => serializeMessage(m, meId)),
  };
}

async function deleteMessage(messageId, userId) {
  const deleted = await repo.deleteMessage(messageId, userId);
  if (!deleted) throw new ApiError(HTTP_STATUS.FORBIDDEN, "You can only delete your own messages");
  return { success: true };
}

// Returns the senders whose messages just got marked read, so the socket
// layer can tell each of them their message(s) were seen.
async function markConversationRead(conversationId, userId) {
  const conversation = await repo.findConversationById(conversationId);
  if (!conversation) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Conversation not found");
  if (conversation.userId1 !== BigInt(userId) && conversation.userId2 !== BigInt(userId)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Not your conversation");
  }

  const nowRead = await repo.markConversationRead(conversationId, userId);
  const otherUserId = (conversation.userId1 === BigInt(userId) ? conversation.userId2 : conversation.userId1).toString();

  return {
    otherUserId,
    messageIds: nowRead.map((m) => m.id.toString()),
  };
}

async function markMessageRead(messageId, userId) {
  const message = await repo.findMessageById(messageId);
  if (!message) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Message not found");

  await repo.markRead(messageId, userId);
  return { senderId: message.senderId.toString() };
}

// Called when a client opens a chat screen with someone: ensures the
// conversation exists and marks everything in it read in one step. Returns
// the same shape markConversationRead does, plus the conversationId, since
// callers (chat.socket.js's chat_open) need both.
async function openConversation(myUserId, otherUserId) {
  await assertFriends(myUserId, otherUserId);
  const conversation = await repo.getOrCreateConversation(myUserId, otherUserId);
  const result = await markConversationRead(conversation.id, myUserId);
  return { conversationId: conversation.id.toString(), ...result };
}

async function listConversations(userId) {
  const rows = await repo.listConversationsForUser(userId);

  return rows
    .map(({ conversation, lastMessage, unreadCount }) => {
      const other = conversation.userId1 === BigInt(userId) ? conversation.user2 : conversation.user1;
      return {
        conversationId: conversation.id.toString(),
        with: serializeUserSummary(other),
        lastMessage: lastMessage
          ? { content: lastMessage.content, sentAt: lastMessage.sentAt, senderId: lastMessage.senderId.toString() }
          : null,
        unreadCount,
        lastActivityAt: lastMessage?.sentAt || conversation.createdAt,
      };
    })
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
}

module.exports = {
  assertFriends,
  sendMessage,
  getMessages,
  deleteMessage,
  markConversationRead,
  markMessageRead,
  openConversation,
  listConversations,
};