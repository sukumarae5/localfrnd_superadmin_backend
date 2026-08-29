const { prisma } = require("../../config/database");

const bannerListSelect = {
  id: true,
  publicId: true,
  displayCode: true,
  title: true,
  bannerType: true,
  category: true,
  position: true,
  imageUrl: true,
  platforms: true,
  priority: true,
  status: true,
  startAt: true,
  endAt: true,
  impressionsCount: true,
  clicksCount: true,
  conversionsCount: true,
  createdAt: true,
};

const bannerDetailInclude = {
  createdByAdmin: { select: { id: true, fullName: true } },
  updatedByAdmin: { select: { id: true, fullName: true } },
};

function buildWhere(filters = {}) {
  const where = { isDeleted: false };

  if (filters.bannerType) where.bannerType = filters.bannerType;
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  if (filters.position) where.position = filters.position;
  if (filters.platform) where.platforms = { has: filters.platform };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { displayCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  return where;
}

async function createBanner(data) {
  return prisma.banner.create({ data });
}

async function findByDisplayCode(displayCode) {
  return prisma.banner.findUnique({ where: { displayCode } });
}

async function findByPublicId(publicId, { includeDetails = false } = {}) {
  return prisma.banner.findFirst({
    where: { publicId, isDeleted: false },
    include: includeDetails ? bannerDetailInclude : undefined,
  });
}

async function findById(id) {
  return prisma.banner.findFirst({ where: { id, isDeleted: false } });
}

async function listBanners({ filters, page, limit, sortBy, sortOrder }) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      select: bannerListSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.banner.count({ where }),
  ]);

  return { items, total };
}

async function listActiveBanners({ bannerType, platform, position }) {
  const now = new Date();
  const where = {
    isDeleted: false,
    status: "ACTIVE",
    bannerType,
    platforms: { has: platform },
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };
  if (position) where.position = position;

  return prisma.banner.findMany({
    where,
    select: {
      publicId: true,
      title: true,
      imageUrl: true,
      imageWidth: true,
      imageHeight: true,
      deepLink: true,
      campaignValue: true,
      position: true,
      priority: true,
    },
    orderBy: { priority: "asc" },
  });
}

async function updateBanner(id, data) {
  return prisma.banner.update({ where: { id }, data });
}

async function softDeleteBanner(id) {
  return prisma.banner.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), status: "ARCHIVED" },
  });
}

async function incrementImpressions(id) {
  return prisma.banner.update({
    where: { id },
    data: { impressionsCount: { increment: 1 } },
  });
}

async function incrementClicks(id) {
  return prisma.banner.update({
    where: { id },
    data: { clicksCount: { increment: 1 } },
  });
}

async function getSummaryStats(bannerType) {
  const where = { isDeleted: false, ...(bannerType ? { bannerType } : {}) };

  const [total, active, scheduled, expired, draft, paused, aggregates] = await Promise.all([
    prisma.banner.count({ where }),
    prisma.banner.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.banner.count({ where: { ...where, status: "SCHEDULED" } }),
    prisma.banner.count({ where: { ...where, status: "EXPIRED" } }),
    prisma.banner.count({ where: { ...where, status: "DRAFT" } }),
    prisma.banner.count({ where: { ...where, status: "PAUSED" } }),
    prisma.banner.aggregate({
      where,
      _sum: { clicksCount: true, impressionsCount: true, conversionsCount: true },
    }),
  ]);

  return {
    total,
    active,
    scheduled,
    expired,
    draft,
    paused,
    totalClicks: aggregates._sum.clicksCount || 0n,
    totalImpressions: aggregates._sum.impressionsCount || 0n,
    totalConversions: aggregates._sum.conversionsCount || 0n,
  };
}

async function getEngagementDistribution(bannerType) {
  const where = { isDeleted: false, ...(bannerType ? { bannerType } : {}) };
  return prisma.banner.groupBy({
    by: ["category"],
    where,
    _sum: { clicksCount: true, impressionsCount: true },
  });
}

async function getTopPerforming(bannerType, limit = 5) {
  const where = { isDeleted: false, ...(bannerType ? { bannerType } : {}) };
  return prisma.banner.findMany({
    where,
    select: {
      publicId: true,
      title: true,
      clicksCount: true,
      impressionsCount: true,
    },
    orderBy: { clicksCount: "desc" },
    take: limit,
  });
}

async function createAuditLog(data) {
  return prisma.bannerAuditLog.create({ data });
}

async function listAuditLogs(bannerId) {
  return prisma.bannerAuditLog.findMany({
    where: { bannerId },
    include: { performedByAdmin: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
  });
}

module.exports = {
  createBanner,
  findByDisplayCode,
  findByPublicId,
  findById,
  listBanners,
  listActiveBanners,
  updateBanner,
  softDeleteBanner,
  incrementImpressions,
  incrementClicks,
  getSummaryStats,
  getEngagementDistribution,
  getTopPerforming,
  createAuditLog,
  listAuditLogs,
};