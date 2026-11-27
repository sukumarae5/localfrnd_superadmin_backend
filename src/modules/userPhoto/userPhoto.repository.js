const { prisma } = require("../../config/database");

const listByUserId = (userId) =>
  prisma.userPhoto.findMany({
    where: { userId: BigInt(userId) },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

const countByUserId = (userId) =>
  prisma.userPhoto.count({ where: { userId: BigInt(userId) } });

// createMany() does not return the created rows, so create inside one transaction
const createMany = (userId, items) =>
  prisma.$transaction(
    items.map((item) =>
      prisma.userPhoto.create({ data: { userId: BigInt(userId), ...item } })
    )
  );

const findByPublicId = (userId, publicId) =>
  prisma.userPhoto.findFirst({ where: { userId: BigInt(userId), publicId } });

const deleteById = (id) => prisma.userPhoto.delete({ where: { id } });

module.exports = { listByUserId, countByUserId, createMany, findByPublicId, deleteById };