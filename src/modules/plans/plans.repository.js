const { prisma } = require("../../config/database");

function listPlans({ isActive }) {
  return prisma.subscriptionPlan.findMany({
    where: isActive !== undefined ? { isActive } : {},
    orderBy: { priceCents: "asc" },
  });
}

function findPlanById(id) {
  return prisma.subscriptionPlan.findUnique({ where: { id: Number(id) } });
}

function findPlanByCode(code) {
  return prisma.subscriptionPlan.findUnique({ where: { code } });
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

module.exports = {
  listPlans, findPlanById, findPlanByCode, createPlan, updatePlan, setPlanActive,
  listSubscriptions, assignSubscription,
};