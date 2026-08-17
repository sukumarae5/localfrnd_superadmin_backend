// src/modules/avatar/avatar.repository.js
const { prisma } = require("../../config/database");

function buildWhere({ search, gender, isActive }) {
  const where = { deletedAt: null };
  if (gender) where.gender = gender;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) where.name = { contains: search, mode: "insensitive" };
  return where;
}

async function listAvatars({ page, limit, search, gender, isActive }) {
  const where = buildWhere({ search, gender, isActive });
  const skip = (page - 1) * limit;

  const [avatars, total] = await prisma.$transaction([
    prisma.avatar.findMany({ where, skip, take: limit, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.avatar.count({ where }),
  ]);

  return { avatars, total };
}

function findById(id) {
  return prisma.avatar.findUnique({ where: { id: Number(id) } });
}

function create(data) {
  return prisma.avatar.create({ data });
}

function update(id, data) {
  return prisma.avatar.update({ where: { id: Number(id) }, data });
}

function softDelete(id) {
  return prisma.avatar.update({ where: { id: Number(id) }, data: { deletedAt: new Date(), isActive: false } });
}

// An avatar in active use by real users shouldn't have its Cloudinary asset
// deleted just because an admin removed it from the picker — those users'
// avatarUrl is a snapshot pointing straight at that image.
function countUsersUsingAvatar(id) {
  return prisma.user.count({ where: { avatarId: Number(id) } });
}

module.exports = { listAvatars, findById, create, update, softDelete, countUsersUsingAvatar };