const { prisma } = require("../../config/database");

const offerListSelect = {
  id: true,
  publicId: true,
  displayCode: true,
  name: true,
  offerType: true,
  discountType: true,
  discountValue: true,
  couponCode: true,
  bannerImageUrl: true,
  status: true,
  isPaused: true,
  startAt: true,
  endAt: true,
  redemptionsCount: true,
  revenueGenerated: true,
  createdAt: true,
};

function buildWhere(filters = {}) {
  const where = { isDeleted: false };

  if (filters.offerType) where.offerType = filters.offerType;
  if (filters.status) where.status = filters.status;
  if (filters.discountType) where.discountType = filters.discountType;

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { couponCode: { contains: filters.search, mode: "insensitive" } },
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

function listOffers({ filters, page, limit, sortBy, sortOrder }) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.offer.findMany({
      where,
      select: offerListSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.offer.count({ where }),
  ]);
}

function findOfferByPublicId(publicId, { includeDetails = false } = {}) {
  return prisma.offer.findFirst({
    where: { publicId, isDeleted: false },
    include: includeDetails
      ? {
          createdBy: { select: { id: true, fullName: true } },
          updatedBy: { select: { id: true, fullName: true } },
        }
      : undefined,
  });
}

function findOfferById(id) {
  return prisma.offer.findFirst({ where: { id: BigInt(id), isDeleted: false } });
}

function findOfferByCouponCode(couponCode) {
  return prisma.offer.findFirst({ where: { couponCode: couponCode.toUpperCase(), isDeleted: false } });
}

function findOfferByDisplayCode(displayCode) {
  return prisma.offer.findUnique({ where: { displayCode } });
}

function createOffer(data) {
  return prisma.offer.create({ data });
}

function updateOffer(id, data) {
  return prisma.offer.update({ where: { id }, data });
}

function softDeleteOffer(id) {
  return prisma.offer.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

async function createAuditLog(data) {
  return prisma.offerAuditLog.create({ data });
}

function listAuditLogs(offerId) {
  return prisma.offerAuditLog.findMany({
    where: { offerId },
    include: { performedByAdmin: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// ---- Dashboard analytics (Recharge Offers screen) ----

async function getDashboardSummary() {
  const [total, active, scheduled, expired, aggregates] = await prisma.$transaction([
    prisma.offer.count({ where: { isDeleted: false } }),
    prisma.offer.count({ where: { isDeleted: false, status: "ACTIVE" } }),
    prisma.offer.count({ where: { isDeleted: false, status: "SCHEDULED" } }),
    prisma.offer.count({ where: { isDeleted: false, status: "EXPIRED" } }),
    prisma.offer.aggregate({
      where: { isDeleted: false },
      _sum: {
        revenueGenerated: true,
        redemptionsCount: true,
        bonusCoinsIssued: true,
        viewsCount: true,
        clicksCount: true,
      },
      _avg: { discountValue: true },
    }),
  ]);

  return {
    total,
    active,
    scheduled,
    expired,
    revenueGenerated: aggregates._sum.revenueGenerated || 0,
    redemptions: aggregates._sum.redemptionsCount || 0,
    bonusCoinsIssued: aggregates._sum.bonusCoinsIssued || 0n,
    totalViews: aggregates._sum.viewsCount || 0,
    totalClicks: aggregates._sum.clicksCount || 0,
    avgDiscount: aggregates._avg.discountValue || 0,
  };
}

function getDailyRedemptions(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return prisma.offerRedemption.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
}

function getRecentAuditActivity(limit = 10) {
  return prisma.offerAuditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      offer: { select: { id: true, name: true } },
      performedByAdmin: { select: { id: true, fullName: true } },
    },
  });
}

async function incrementViews(id) {
  return prisma.offer.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
}

async function incrementClicks(id) {
  return prisma.offer.update({ where: { id }, data: { clicksCount: { increment: 1 } } });
}

module.exports = {
  listOffers,
  findOfferByPublicId,
  findOfferById,
  findOfferByCouponCode,
  findOfferByDisplayCode,
  createOffer,
  updateOffer,
  softDeleteOffer,
  createAuditLog,
  listAuditLogs,
  getDashboardSummary,
  getDailyRedemptions,
  getRecentAuditActivity,
  incrementViews,
  incrementClicks,
};