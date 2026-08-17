const { prisma } = require("../../config/database");

const DISPLAY_CODE_PREFIX = "IC";

const generateDisplayCode = async (tx = prisma) => {
  const count = await tx.interestCategory.count();
  let attempt = count + 1;

  for (let i = 0; i < 5; i++) {
    const candidate = `${DISPLAY_CODE_PREFIX}-${String(attempt).padStart(3, "0")}`;
    const exists = await tx.interestCategory.findUnique({
      where: { displayCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    attempt += 1;
  }
  throw new Error("Failed to generate a unique interest category display code");
};

const slugify = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const includeDefault = {
  languages: { include: { language: true } },
  createdBy: { select: { id: true, fullName: true } },
  updatedBy: { select: { id: true, fullName: true } },
};

const create = async ({ languageIds = [], ...data }) => {
  return prisma.$transaction(async (tx) => {
    const displayCode = await generateDisplayCode(tx);
    let slug = slugify(data.name);

    const slugExists = await tx.interestCategory.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

    return tx.interestCategory.create({
      data: {
        ...data,
        slug,
        displayCode,
        languages: languageIds.length
          ? { create: languageIds.map((languageId) => ({ languageId: Number(languageId) })) }
          : undefined,
      },
      include: includeDefault,
    });
  });
};

const findByPublicId = async (publicId) => {
  return prisma.interestCategory.findFirst({
    where: { publicId, deletedAt: null },
    include: includeDefault,
  });
};

const buildListWhere = (filters) => {
  const where = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.visibility) where.visibility = filters.visibility;
  if (typeof filters.isFeatured === "boolean") where.isFeatured = filters.isFeatured;
  if (typeof filters.isTrending === "boolean") where.isTrending = filters.isTrending;
  if (filters.languageId) {
    where.languages = { some: { languageId: Number(filters.languageId) } };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { displayCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
};

const list = async (filters, { page, limit, sortBy, sortDir }) => {
  const where = buildListWhere(filters);
  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.interestCategory.findMany({
      where,
      include: includeDefault,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    prisma.interestCategory.count({ where }),
  ]);

  return { items, total };
};

const withUserAndRjCounts = async (categories) => {
  const ids = categories.map((c) => c.id);
  if (!ids.length) return categories;

  const [userCounts, rjCounts] = await Promise.all([
    prisma.userInterest.groupBy({
      by: ["interestCategoryId"],
      where: { interestCategoryId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.rJInterest.groupBy({
      by: ["interestCategoryId"],
      where: { interestCategoryId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const userMap = new Map(userCounts.map((u) => [u.interestCategoryId.toString(), u._count._all]));
  const rjMap = new Map(rjCounts.map((r) => [r.interestCategoryId.toString(), r._count._all]));

  return categories.map((c) => ({
    ...c,
    usersSelectedCount: userMap.get(c.id.toString()) || 0,
    assignedRjCount: rjMap.get(c.id.toString()) || 0,
  }));
};

const update = async (id, { languageIds, ...data }) => {
  return prisma.$transaction(async (tx) => {
    if (languageIds) {
      await tx.interestCategoryLanguage.deleteMany({ where: { interestCategoryId: BigInt(id) } });
      if (languageIds.length) {
        await tx.interestCategoryLanguage.createMany({
          data: languageIds.map((languageId) => ({
            interestCategoryId: BigInt(id),
            languageId: Number(languageId),
          })),
        });
      }
    }

    return tx.interestCategory.update({
      where: { id: BigInt(id) },
      data,
      include: includeDefault,
    });
  });
};

const softDelete = async (id) => {
  return prisma.interestCategory.update({
    where: { id: BigInt(id) },
    data: { deletedAt: new Date(), status: "inactive" },
  });
};

const getStats = async () => {
  const [
    totalInterests,
    activeCount,
    featuredCount,
    trendingCount,
    totalUsersSelected,
    rjGroups,
    scoreAgg,
    mostPopular,
  ] = await prisma.$transaction([
    prisma.interestCategory.count({ where: { deletedAt: null } }),
    prisma.interestCategory.count({ where: { deletedAt: null, status: "active" } }),
    prisma.interestCategory.count({ where: { deletedAt: null, isFeatured: true } }),
    prisma.interestCategory.count({ where: { deletedAt: null, isTrending: true } }),
    prisma.userInterest.count(),
    prisma.rJInterest.groupBy({ by: ["rjId"] }),
    prisma.interestCategory.aggregate({
      where: { deletedAt: null },
      _avg: { recommendationScore: true },
    }),
    prisma.userInterest.groupBy({
      by: ["interestCategoryId"],
      _count: { _all: true },
      orderBy: { _count: { interestCategoryId: "desc" } },
      take: 1,
    }),
  ]);

  let mostPopularCategory = null;
  if (mostPopular.length) {
    const cat = await prisma.interestCategory.findUnique({
      where: { id: mostPopular[0].interestCategoryId },
      select: { name: true },
    });
    mostPopularCategory = {
      name: cat?.name || null,
      usersSelectedCount: mostPopular[0]._count._all,
      trafficSharePct: null, // needs a traffic/events table not currently modeled
    };
  }

  return {
    totalInterests,
    totalInterestsGrowthPct: null, // needs a daily snapshot table not currently modeled
    activeCount,
    activePct: totalInterests ? Number(((activeCount / totalInterests) * 100).toFixed(1)) : 0,
    featuredCount,
    trendingCount,
    trendingGrowthPct: null,
    totalUsersSelected,
    totalAssignedRjs: rjGroups.length,
    mostPopularCategory,
    avgRecommendationScore: scoreAgg._avg.recommendationScore
      ? Number(scoreAgg._avg.recommendationScore.toFixed(1))
      : 0,
  };
};

module.exports = {
  create,
  findByPublicId,
  list,
  withUserAndRjCounts,
  update,
  softDelete,
  getStats,
  slugify,
};