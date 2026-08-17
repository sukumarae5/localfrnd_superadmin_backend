const { prisma } = require("../../../config/database");

const assign = async (rjId, interestCategoryId, adminId) => {
  return prisma.rJInterest.upsert({
    where: { rjId_interestCategoryId: { rjId: BigInt(rjId), interestCategoryId } },
    update: {},
    create: {
      rjId: BigInt(rjId),
      interestCategoryId,
      assignedById: adminId ? BigInt(adminId) : undefined,
    },
  });
};

const unassign = async (rjId, interestCategoryId) => {
  return prisma.rJInterest
    .delete({ where: { rjId_interestCategoryId: { rjId: BigInt(rjId), interestCategoryId } } })
    .catch(() => null);
};

const replaceForRj = async (rjId, categoryIds) => {
  return prisma.$transaction(async (tx) => {
    await tx.rJInterest.deleteMany({ where: { rjId: BigInt(rjId) } });
    if (categoryIds.length) {
      await tx.rJInterest.createMany({
        data: categoryIds.map((interestCategoryId) => ({ rjId: BigInt(rjId), interestCategoryId })),
      });
    }
    return tx.rJInterest.findMany({ where: { rjId: BigInt(rjId) }, include: { interestCategory: true } });
  });
};

const findByCategory = async (interestCategoryId, { page, limit }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await prisma.$transaction([
    prisma.rJInterest.findMany({
      where: { interestCategoryId },
      include: {
        rj: {
          select: {
            id: true,
            publicId: true,
            displayCode: true,
            status: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
      skip,
      take: limit,
    }),
    prisma.rJInterest.count({ where: { interestCategoryId } }),
  ]);
  return { items, total };
};

const findRecommendedRjsForUser = async (userId, limit = 10) => {
  const userInterests = await prisma.userInterest.findMany({
    where: { userId: BigInt(userId) },
    select: { interestCategoryId: true },
  });

  const categoryIds = userInterests.map((ui) => ui.interestCategoryId);
  if (!categoryIds.length) return [];

  const overlaps = await prisma.rJInterest.groupBy({
    by: ["rjId"],
    where: { interestCategoryId: { in: categoryIds } },
    _count: { _all: true },
    orderBy: { _count: { rjId: "desc" } },
    take: limit,
  });
  if (!overlaps.length) return [];

  const rjIds = overlaps.map((o) => o.rjId);
  const rjs = await prisma.rJ.findMany({
    where: { id: { in: rjIds }, deletedAt: null, verificationStatus: "verified" },
    select: {
      id: true,
      publicId: true,
      displayCode: true,
      tier: true,
      status: true,
      avgRating: true,
      user: { select: { fullName: true, bio: true, avatarUrl: true } },
    },
  });

  const overlapMap = new Map(overlaps.map((o) => [o.rjId.toString(), o._count._all]));
  return rjs
    .map((rj) => ({ ...rj, matchedInterestCount: overlapMap.get(rj.id.toString()) || 0 }))
    .sort((a, b) => {
      if (b.matchedInterestCount !== a.matchedInterestCount) return b.matchedInterestCount - a.matchedInterestCount;
      return a.status === "online" ? -1 : 1;
    });
};

module.exports = { assign, unassign, replaceForRj, findByCategory, findRecommendedRjsForUser };