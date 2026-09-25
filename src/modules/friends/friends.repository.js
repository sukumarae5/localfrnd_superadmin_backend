// src/modules/friends/friends.repository.js
// All Prisma calls for the Friendship model live here — see
// engineering-conventions: "Prisma calls belong in repositories only."
const { prisma } = require("../../config/database");

// The Friendship row is stored once per pair with userId1 < userId2 (see
// social.prisma's header comment and the uq_friendship_pair unique
// constraint), mirroring the reference app's normalize(a, b) = {u1, u2}.
function normalizePair(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? { userId1: x, userId2: y } : { userId1: y, userId2: x };
}

const USER_SUMMARY_SELECT = {
  id: true,
  publicId: true,
  fullName: true,
  avatarUrl: true,
  gender: true,
  deletedAt: true,
};

function findByPair(a, b) {
  const { userId1, userId2 } = normalizePair(a, b);
  return prisma.friendship.findUnique({
    where: { uq_friendship_pair: { userId1, userId2 } },
  });
}

function findPendingByPublicId(publicId) {
  return prisma.friendship.findUnique({ where: { publicId } });
}

function createRequest(fromUserId, toUserId) {
  const { userId1, userId2 } = normalizePair(fromUserId, toUserId);
  return prisma.friendship.create({
    data: { userId1, userId2, requestedById: BigInt(fromUserId), status: "pending" },
  });
}

// Flips a pending request to accepted and creates the Conversation for the
// pair in the same transaction, so "accepted" and "can now chat" can never
// go out of sync. `accepterUserId` must NOT be the one who sent the
// request — you accept someone else's request, never your own.
async function acceptRequest(requestPublicId, accepterUserId) {
  return prisma.$transaction(async (tx) => {
    const friendship = await tx.friendship.findUnique({ where: { publicId: requestPublicId } });
    if (!friendship || friendship.status !== "pending") return null;
    if (friendship.requestedById === BigInt(accepterUserId)) return null; // can't accept your own request
    if (friendship.userId1 !== BigInt(accepterUserId) && friendship.userId2 !== BigInt(accepterUserId)) return null; // not a party to this request

    const updated = await tx.friendship.update({
      where: { id: friendship.id },
      data: { status: "accepted" },
    });

    await tx.conversation.upsert({
      where: { uq_conversation_pair: { userId1: friendship.userId1, userId2: friendship.userId2 } },
      create: { userId1: friendship.userId1, userId2: friendship.userId2 },
      update: {},
    });

    return updated;
  });
}

// Declines a request you received. Only the non-sender may reject — the
// sender withdraws their own request via cancelRequest() instead.
async function rejectRequest(requestPublicId, rejecterUserId) {
  const friendship = await prisma.friendship.findUnique({ where: { publicId: requestPublicId } });
  if (!friendship || friendship.status !== "pending") return null;
  if (friendship.requestedById === BigInt(rejecterUserId)) return null;
  if (friendship.userId1 !== BigInt(rejecterUserId) && friendship.userId2 !== BigInt(rejecterUserId)) return null;

  await prisma.friendship.delete({ where: { id: friendship.id } });
  return friendship;
}

// Withdraws a request you sent, before the other side has responded.
async function cancelRequest(requestPublicId, senderUserId) {
  const friendship = await prisma.friendship.findUnique({ where: { publicId: requestPublicId } });
  if (!friendship || friendship.status !== "pending") return null;
  if (friendship.requestedById !== BigInt(senderUserId)) return null;

  await prisma.friendship.delete({ where: { id: friendship.id } });
  return friendship;
}

function listAccepted(userId) {
  const id = BigInt(userId);
  return prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ userId1: id }, { userId2: id }] },
    include: {
      user1: { select: USER_SUMMARY_SELECT },
      user2: { select: USER_SUMMARY_SELECT },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function listPendingReceived(userId) {
  const id = BigInt(userId);
  return prisma.friendship.findMany({
    where: {
      status: "pending",
      OR: [{ userId1: id }, { userId2: id }],
      requestedById: { not: id },
    },
    include: { requestedBy: { select: USER_SUMMARY_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

function listPendingSent(userId) {
  const id = BigInt(userId);
  return prisma.friendship.findMany({
    where: { status: "pending", requestedById: id },
    include: {
      user1: { select: USER_SUMMARY_SELECT },
      user2: { select: USER_SUMMARY_SELECT },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function removeFriendship(meId, otherId) {
  const { userId1, userId2 } = normalizePair(meId, otherId);
  const friendship = await prisma.friendship.findUnique({ where: { uq_friendship_pair: { userId1, userId2 } } });
  if (!friendship || friendship.status !== "accepted") return null;
  await prisma.friendship.delete({ where: { id: friendship.id } });
  return friendship;
}

function findUserSummary(userId) {
  return prisma.user.findUnique({ where: { id: BigInt(userId) }, select: USER_SUMMARY_SELECT });
}

module.exports = {
  normalizePair,
  findByPair,
  findPendingByPublicId,
  createRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  listAccepted,
  listPendingReceived,
  listPendingSent,
  removeFriendship,
  findUserSummary,
};