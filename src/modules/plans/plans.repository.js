const { prisma } = require("../../config/database");

const planListSelect = {
  id: true,
  publicId: true,
  displayCode: true,
  code: true,
  displayName: true,
  shortDescription: true,
  planType: true,
  badgeText: true,
  iconUrl: true,
  bannerImageUrl: true,
  themeColor: true,
  baseCoins: true,
  bonusCoins: true,
  coins: true,
  minutes: true,
  validityDays: true,
  originalPrice: true,
  discountPercent: true,
  priceAfterDiscount: true,
  displayPriority: true,
  isFeatured: true,
  isPremiumBadge: true,
  cashbackEnabled: true,
  isActive: true,
  isDraft: true,
  viewsCount: true,
  purchasesCount: true,
  refundsCount: true,
  revenueTotal: true,
  createdAt: true,
  updatedAt: true,
};

function buildWhere(filters = {}) {
  const where = { deletedAt: null };

  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.isDraft !== undefined) where.isDraft = filters.isDraft;
  if (filters.planType) where.planType = filters.planType;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.priceAfterDiscount = {};
    if (filters.minPrice !== undefined) where.priceAfterDiscount.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.priceAfterDiscount.lte = filters.maxPrice;
  }

  if (filters.minCoins !== undefined || filters.maxCoins !== undefined) {
    where.coins = {};
    if (filters.minCoins !== undefined) where.coins.gte = filters.minCoins;
    if (filters.maxCoins !== undefined) where.coins.lte = filters.maxCoins;
  }

  if (filters.validityDays !== undefined) where.validityDays = filters.validityDays;

  if (filters.search) {
    where.OR = [
      { displayName: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { displayCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function listPlans({ filters, page, limit, sortBy, sortOrder }) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.subscriptionPlan.findMany({
      where,
      select: planListSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.subscriptionPlan.count({ where }),
  ]);
}

function findPlanById(id) {
  return prisma.subscriptionPlan.findFirst({ where: { id: Number(id), deletedAt: null } });
}

function findPlanByPublicId(publicId, { includeAudit = false } = {}) {
  return prisma.subscriptionPlan.findFirst({
    where: { publicId, deletedAt: null },
    include: includeAudit
      ? {
          createdBy: { select: { id: true, fullName: true } },
          updatedBy: { select: { id: true, fullName: true } },
        }
      : undefined,
  });
}

function findPlanByCode(code) {
  return prisma.subscriptionPlan.findFirst({ where: { code, deletedAt: null } });
}

function findPlanByDisplayCode(displayCode) {
  return prisma.subscriptionPlan.findUnique({ where: { displayCode } });
}

function createPlan(data) {
  return prisma.subscriptionPlan.create({ data });
}

function updatePlan(id, data) {
  return prisma.subscriptionPlan.update({ where: { id: Number(id) }, data });
}

function setPlanActive(id, isActive) {
  return prisma.subscriptionPlan.update({ where: { id: Number(id) }, data: { isActive } });
}

function softDeletePlan(id) {
  return prisma.subscriptionPlan.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), isActive: false },
  });
}

function incrementViews(id) {
  return prisma.subscriptionPlan.update({
    where: { id: Number(id) },
    data: { viewsCount: { increment: 1 } },
  });
}

async function createAuditLog(data) {
  return prisma.rechargePlanAuditLog.create({ data });
}

function listAuditLogs(planId) {
  return prisma.rechargePlanAuditLog.findMany({
    where: { planId: Number(planId) },
    include: { performedByAdmin: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// ---- Dashboard analytics (Recharge Plans list screen) ----

async function getDashboardSummary() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [
    totalPlans,
    activePlans,
    inactivePlans,
    aggregateAll,
    todayPurchases,
    mtdPurchases,
    mostPurchased,
  ] = await prisma.$transaction([
    prisma.subscriptionPlan.count({ where: { deletedAt: null } }),
    prisma.subscriptionPlan.count({ where: { deletedAt: null, isActive: true, isDraft: false } }),
    prisma.subscriptionPlan.count({ where: { deletedAt: null, isActive: false } }),
    prisma.subscriptionPlan.aggregate({
      where: { deletedAt: null },
      _sum: { purchasesCount: true, revenueTotal: true },
      _avg: { priceAfterDiscount: true },
    }),
    prisma.userSubscription.aggregate({
      where: { createdAt: { gte: startOfToday }, isRefunded: false },
      _sum: { pricePaid: true },
      _count: true,
    }),
    prisma.userSubscription.aggregate({
      where: { createdAt: { gte: startOfMonth }, isRefunded: false },
      _sum: { pricePaid: true },
    }),
    prisma.subscriptionPlan.findFirst({
      where: { deletedAt: null },
      orderBy: { purchasesCount: "desc" },
      select: { id: true, displayName: true, purchasesCount: true },
    }),
  ]);

  return {
    totalPlans,
    activePlans,
    inactivePlans,
    totalPurchases: aggregateAll._sum.purchasesCount || 0,
    revenueLifetime: aggregateAll._sum.revenueTotal || 0,
    avgPlanValue: aggregateAll._avg.priceAfterDiscount || 0,
    revenueToday: todayPurchases._sum.pricePaid || 0,
    purchasesToday: todayPurchases._count || 0,
    revenueMTD: mtdPurchases._sum.pricePaid || 0,
    mostPurchasedPlan: mostPurchased,
  };
}

function getTopSellingPlans(limit = 5) {
  return prisma.subscriptionPlan.findMany({
    where: { deletedAt: null },
    select: { id: true, displayCode: true, displayName: true, purchasesCount: true, revenueTotal: true },
    orderBy: { purchasesCount: "desc" },
    take: limit,
  });
}

function getRevenueSummary() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  return prisma.$transaction([
    prisma.userSubscription.aggregate({
      where: { createdAt: { gte: startOfToday }, isRefunded: false },
      _sum: { pricePaid: true },
    }),
    prisma.userSubscription.aggregate({
      where: { createdAt: { gte: startOfWeek }, isRefunded: false },
      _sum: { pricePaid: true },
    }),
    prisma.userSubscription.aggregate({
      where: { createdAt: { gte: startOfMonth }, isRefunded: false },
      _sum: { pricePaid: true },
    }),
    prisma.userSubscription.aggregate({
      where: { isRefunded: false },
      _sum: { pricePaid: true },
    }),
  ]);
}

function getRecentPurchases(limit = 10) {
  return prisma.userSubscription.findMany({
    where: { pricePaid: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, fullName: true, displayCode: true } },
      plan: { select: { id: true, displayName: true } },
    },
  });
}

function getPlanPerformance(planId) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  return prisma.$transaction([
    prisma.userSubscription.count({ where: { planId: Number(planId), createdAt: { gte: since } } }),
    prisma.userSubscription.groupBy({
      by: ["createdAt"],
      where: { planId: Number(planId), createdAt: { gte: since } },
      _count: true,
    }),
  ]);
}

// ---- Purchases / subscriptions ----

function listSubscriptions({ userId, planId, isCurrent, page, limit }) {
  const where = {
    ...(userId ? { userId: BigInt(userId) } : {}),
    ...(planId ? { planId: Number(planId) } : {}),
    ...(isCurrent !== undefined ? { isCurrent } : {}),
  };
  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.userSubscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: "desc" },
      include: {
        plan: true,
        user: { select: { id: true, fullName: true, displayCode: true } },
      },
    }),
    prisma.userSubscription.count({ where }),
  ]);
}

// Marks all of a user's current subscriptions non-current, then creates the new one,
// then points User.currentSubscriptionId at it — all in one transaction.
async function assignSubscription({ userId, planId, expiresAt, createdById }) {
  return prisma.$transaction(async (tx) => {
    await tx.userSubscription.updateMany({
      where: { userId: BigInt(userId), isCurrent: true },
      data: { isCurrent: false },
    });

    const sub = await tx.userSubscription.create({
      data: {
        userId: BigInt(userId),
        planId: Number(planId),
        expiresAt: expiresAt || null,
        isCurrent: true,
        createdById: createdById ? BigInt(createdById) : null,
      },
      include: { plan: true },
    });

    await tx.user.update({
      where: { id: BigInt(userId) },
      data: { currentSubscriptionId: Number(planId) },
    });

    return sub;
  });
}

// Full purchase flow: creates the purchase ledger row, credits the user's
// wallet (coins), bumps plan analytics counters, and — if a coupon was used —
// bumps the offer's redemption counters + writes the redemption row. All in
// one transaction so a partial purchase can never happen.
async function recordPurchase({
  userId,
  plan,
  offer,
  pricePaid,
  bonusCoinsFromOffer,
  paymentMethod,
  couponCode,
}) {
  return prisma.$transaction(async (tx) => {
    await tx.userSubscription.updateMany({
      where: { userId: BigInt(userId), isCurrent: true },
      data: { isCurrent: false },
    });

    const totalCoins = plan.baseCoins + plan.bonusCoins + (bonusCoinsFromOffer || 0);

    const subscription = await tx.userSubscription.create({
      data: {
        userId: BigInt(userId),
        planId: plan.id,
        isCurrent: true,
        pricePaid,
        paymentMethod: paymentMethod || null,
        offerId: offer ? offer.id : null,
        couponCode: couponCode || null,
        expiresAt: plan.validityDays
          ? new Date(Date.now() + plan.validityDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    await tx.user.update({
      where: { id: BigInt(userId) },
      data: { currentSubscriptionId: plan.id },
    });

    const wallet = await tx.userWallet.findUnique({ where: { userId: BigInt(userId) } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    const updatedWallet = await tx.userWallet.update({
      where: { userId: BigInt(userId) },
      data: {
        balance: Number(wallet.balance) + Number(pricePaid),
        coins: wallet.coins + BigInt(totalCoins),
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: BigInt(userId),
        type: "recharge",
        status: "completed",
        amount: pricePaid,
        coins: totalCoins,
        balanceAfter: updatedWallet.balance,
        paymentMethod: paymentMethod || null,
        description: `Recharge — ${plan.displayName}`,
        referenceId: subscription.id.toString(),
      },
    });

    await tx.subscriptionPlan.update({
      where: { id: plan.id },
      data: {
        purchasesCount: { increment: 1 },
        revenueTotal: { increment: Number(pricePaid) },
      },
    });

    let offerRedemption = null;
    if (offer) {
      await tx.offer.update({
        where: { id: offer.id },
        data: {
          redemptionsCount: { increment: 1 },
          revenueGenerated: { increment: Number(pricePaid) },
          bonusCoinsIssued: { increment: BigInt(bonusCoinsFromOffer || 0) },
        },
      });

      offerRedemption = await tx.offerRedemption.create({
        data: {
          offerId: offer.id,
          userId: BigInt(userId),
          subscriptionId: subscription.id,
          discountApplied: offer.discountAppliedAmount || null,
          bonusCoinsGiven: bonusCoinsFromOffer || 0,
        },
      });
    }

    return { subscription, wallet: updatedWallet, offerRedemption };
  });
}

async function refundPurchase(subscriptionId, adminId) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.userSubscription.findUnique({ where: { id: BigInt(subscriptionId) } });
    if (!sub) throw new Error("PURCHASE_NOT_FOUND");
    if (sub.isRefunded) throw new Error("ALREADY_REFUNDED");

    const updated = await tx.userSubscription.update({
      where: { id: BigInt(subscriptionId) },
      data: { isRefunded: true, refundedAt: new Date() },
    });

    if (sub.pricePaid) {
      await tx.subscriptionPlan.update({
        where: { id: sub.planId },
        data: {
          refundsCount: { increment: 1 },
          revenueTotal: { decrement: Number(sub.pricePaid) },
        },
      });

      const wallet = await tx.userWallet.findUnique({ where: { userId: sub.userId } });
      if (wallet) {
        const newBalance = Math.max(0, Number(wallet.balance) - Number(sub.pricePaid));
        const updatedWallet = await tx.userWallet.update({
          where: { userId: sub.userId },
          data: { balance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            userId: sub.userId,
            type: "refund",
            status: "completed",
            amount: sub.pricePaid,
            coins: 0,
            balanceAfter: updatedWallet.balance,
            description: "Recharge plan refund",
            referenceId: sub.id.toString(),
            initiatedById: adminId ? BigInt(adminId) : null,
          },
        });
      }
    }

    return updated;
  });
}

module.exports = {
  listPlans,
  findPlanById,
  findPlanByPublicId,
  findPlanByCode,
  findPlanByDisplayCode,
  createPlan,
  updatePlan,
  setPlanActive,
  softDeletePlan,
  incrementViews,
  createAuditLog,
  listAuditLogs,
  getDashboardSummary,
  getTopSellingPlans,
  getRevenueSummary,
  getRecentPurchases,
  getPlanPerformance,
  listSubscriptions,
  assignSubscription,
  recordPurchase,
  refundPurchase,
};