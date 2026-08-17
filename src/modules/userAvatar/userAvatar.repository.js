// src/modules/userAvatar/userAvatar.repository.js
const { prisma } = require("../../config/database");

function findAvatarById(avatarId) {
  return prisma.avatar.findUnique({ where: { id: Number(avatarId) } });
}

// male/female sees unisex too — matches your GET /api/user/avatars?gender= rule.
function listActiveForGender(gender) {
  return prisma.avatar.findMany({
    where: { deletedAt: null, isActive: true, gender: { in: [gender, "unisex"] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

function findUserById(userId) {
  return prisma.user.findUnique({ where: { id: BigInt(userId) } });
}

function selectAvatar(userId, avatar) {
  return prisma.user.update({
    where: { id: BigInt(userId) },
    data: { avatarId: avatar.id, avatarUrl: avatar.imageUrl, isCustomAvatar: false, avatarCloudinaryId: null },
  });
}

// avatarId is deliberately left untouched — see the design note above.
function setCustomAvatar(userId, { avatarUrl, cloudinaryPublicId }) {
  return prisma.user.update({
    where: { id: BigInt(userId) },
    data: { avatarUrl, isCustomAvatar: true, avatarCloudinaryId: cloudinaryPublicId },
  });
}

function restoreToSelectedOrNull(userId, fallbackAvatar) {
  return prisma.user.update({
    where: { id: BigInt(userId) },
    data: { avatarUrl: fallbackAvatar ? fallbackAvatar.imageUrl : null, isCustomAvatar: false, avatarCloudinaryId: null },
  });
}

module.exports = { findAvatarById, listActiveForGender, findUserById, selectAvatar, setCustomAvatar, restoreToSelectedOrNull };