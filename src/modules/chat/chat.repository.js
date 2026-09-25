// src/modules/chat/chat.repository.js
const { prisma } = require("../../config/database");

const USER_SUMMARY_SELECT = { id: true, publicId: true, fullName: true, avatarUrl: true };

function normalizePair(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? { userId1: x, userId2: y } : { userId1: y, userId2: x };
}

// Self-contained, like the reference app's chatModel.areFriends — this
// module doesn't reach into friends.repository.js, it queries the
// Friendship table directly. Keeps "can these two chat" independently
// verifiable at the point messages are actually sent/read, rather than
// trusting a decision made earlier by a different module.
async function areFriends(userA, userB) {
  const { userId1, userId2 } = normalizePair(userA, userB);
  const friendship = await prisma.friendship.findUnique({
    where: { uq_friendship_pair: { userId1, userId2 } },
    select: { status: true },
  });
  return friendship?.status === "accepted";
}

async function getOrCreateConversation(userA, userB) {
  const { userId1, userId2 } = normalizePair(userA, userB);
  return prisma.conversation.upsert({
    where: { uq_conversation_pair: { userId1, userId2 } },
    create: { userId1, userId2 },
    update: {},
  });
}

function findConversation(userA, userB) {
  const { userId1, userId2 } = normalizePair(userA, userB);
  return prisma.conversation.findUnique({ where: { uq_conversation_pair: { userId1, userId2 } } });
}

function findConversationById(conversationId) {
  return prisma.conversation.findUnique({ where: { id: BigInt(conversationId) } });
}

function insertMessage(conversationId, senderId, content) {
  return prisma.message.create({
    data: { conversationId: BigInt(conversationId), senderId: BigInt(senderId), content },
  });
}

// Fetches newest-first then the service reverses to chronological order —
// same shape as the reference app's getMessages. `reads` here is "who has
// read this message" (at most the one other participant in a 1:1 chat), so
// the service can tell whether a message I sent has been seen.
function getMessages(conversationId, { limit, offset }) {
  return prisma.message.findMany({
    where: { conversationId: BigInt(conversationId), isDeleted: false },
    orderBy: { sentAt: "desc" },
    take: limit,
    skip: offset,
    include: { reads: { select: { userId: true } } },
  });
}

function findMessageById(messageId) {
  return prisma.message.findUnique({ where: { id: BigInt(messageId) } });
}

async function deleteMessage(messageId, senderId) {
  const result = await prisma.message.updateMany({
    where: { id: BigInt(messageId), senderId: BigInt(senderId) },
    data: { isDeleted: true },
  });
  return result.count > 0;
}

function markRead(messageId, userId) {
  return prisma.messageRead.upsert({
    where: { messageId_userId: { messageId: BigInt(messageId), userId: BigInt(userId) } },
    create: { messageId: BigInt(messageId), userId: BigInt(userId) },
    update: {},
  });
}

// Marks every not-yet-read (by me) message in the conversation that I did
// NOT send as read. createMany + skipDuplicates instead of a loop of
// upserts — one round trip regardless of how many messages are unread.
async function markConversationRead(conversationId, userId) {
  const unread = await prisma.message.findMany({
    where: {
      conversationId: BigInt(conversationId),
      senderId: { not: BigInt(userId) },
      isDeleted: false,
      reads: { none: { userId: BigInt(userId) } },
    },
    select: { id: true, senderId: true },
  });

  if (unread.length === 0) return [];

  await prisma.messageRead.createMany({
    data: unread.map((m) => ({ messageId: m.id, userId: BigInt(userId) })),
    skipDuplicates: true,
  });

  return unread; // so the caller can tell each sender their message was read
}

// Chat list overview: every conversation this user is in, its other
// participant, the last message, and how many messages are unread for me.
// Built as a handful of plain queries rather than one large raw SQL join
// (unlike the reference app's chatListModel) — conversation counts per
// user are small, so N+1-ish here is not a real cost, and it stays
// readable/portable across Postgres without hand-tuned SQL.
async function listConversationsForUser(userId) {
  const id = BigInt(userId);
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userId1: id }, { userId2: id }] },
    include: {
      user1: { select: USER_SUMMARY_SELECT },
      user2: { select: USER_SUMMARY_SELECT },
    },
  });

  return Promise.all(
    conversations.map(async (c) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({
          where: { conversationId: c.id, isDeleted: false },
          orderBy: { sentAt: "desc" },
        }),
        prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: id },
            isDeleted: false,
            reads: { none: { userId: id } },
          },
        }),
      ]);
      return { conversation: c, lastMessage, unreadCount };
    })
  );
}

module.exports = {
  normalizePair,
  areFriends,
  getOrCreateConversation,
  findConversation,
  findConversationById,
  insertMessage,
  getMessages,
  findMessageById,
  deleteMessage,
  markRead,
  markConversationRead,
  listConversationsForUser,
};