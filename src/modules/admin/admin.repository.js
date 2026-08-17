const { prisma } = require("../../config/database");

function findRoleByCode(code) {
  return prisma.adminRole.findUnique({ where: { code } });
}

function findByEmail(email) {
  return prisma.admin.findUnique({ where: { email } });
}

function findByPublicId(publicId) {
  return prisma.admin.findUnique({
    where: { publicId },
    include: { role: true },
  });
}

function findByIdWithPassword(id) {
  return prisma.admin.findUnique({
    where: { id: BigInt(id) },
  });
}

function createAdmin(data) {
  return prisma.admin.create({
    data,
    include: { role: true },
  });
}

function list({ skip, take }) {
  return prisma.admin.findMany({
    where: { deletedAt: null },
    include: { role: true },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

function count() {
  return prisma.admin.count({ where: { deletedAt: null } });
}

function updateById(id, data) {
  return prisma.admin.update({
    where: { id: BigInt(id) },
    data,
    include: { role: true },
  });
}

function updatePasswordAndRevokeSessions(id, passwordHash) {
  return prisma.$transaction([
    prisma.admin.update({
      where: { id: BigInt(id) },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.adminAuthSession.updateMany({
      where: { adminId: BigInt(id), revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

function softDelete(id) {
  return prisma.admin.update({
    where: { id: BigInt(id) },
    data: { status: "inactive", deletedAt: new Date() },
  });
}

module.exports = {
  findRoleByCode,
  findByEmail,
  findByPublicId,
  findByIdWithPassword,
  createAdmin,
  list,
  count,
  updateById,
  updatePasswordAndRevokeSessions,
  softDelete,
};