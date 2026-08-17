const { prisma } = require("../../config/database");

const findActivePublicByIds = async (publicIds) => {
  return prisma.interestCategory.findMany({
    where: { publicId: { in: publicIds }, deletedAt: null, status: "active", visibility: "public" },
  });
};

const listSelectable = async () => {
  return prisma.interestCategory.findMany({
    where: { deletedAt: null, status: "active", visibility: "public" },
    orderBy: { sortOrder: "asc" },
  });
};

const replaceUserInterests = async (userId, categoryIds) => {
  return prisma.$transaction(async (tx) => {
    await tx.userInterest.deleteMany({ where: { userId: BigInt(userId) } });
    if (categoryIds.length) {
      await tx.userInterest.createMany({
        data: categoryIds.map((interestCategoryId) => ({ userId: BigInt(userId), interestCategoryId })),
      });
    }
    return tx.userInterest.findMany({
      where: { userId: BigInt(userId) },
      include: { interestCategory: true },
    });
  });
};

const findByUserId = async (userId) => {
  return prisma.userInterest.findMany({
    where: { userId: BigInt(userId) },
    include: { interestCategory: true },
  });
};

module.exports = { findActivePublicByIds, listSelectable, replaceUserInterests, findByUserId };
