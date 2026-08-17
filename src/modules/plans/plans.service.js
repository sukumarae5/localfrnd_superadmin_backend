const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./plans.repository");
const usersRepo = require("../users/users.repository");

function computePriceAfterDiscount(originalPrice, discountPercent) {
  const discounted = Number(originalPrice) * (1 - Number(discountPercent) / 100);
  return Math.round(discounted * 100) / 100; // round to 2 decimals
}

function serializePlan(p) {
  return {
    id: p.id,
    code: p.code,
    displayName: p.displayName,
    coins: p.coins,
    minutes: p.minutes,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
    priceAfterDiscount: p.priceAfterDiscount,
    features: p.features,
    isActive: p.isActive,
    createdAt: p.createdAt,
  };
}

function serializeSubscription(s) {
  return {
    id: s.id.toString(),
    userId: s.user.id.toString(),
    userName: s.user.fullName,
    userDisplayCode: s.user.displayCode,
    plan: serializePlan(s.plan),
    startedAt: s.startedAt,
    expiresAt: s.expiresAt,
    isCurrent: s.isCurrent,
  };
}

async function listPlans(query) {
  const plans = await repo.listPlans({
    isActive: query.isActive === undefined ? undefined : query.isActive === "true" || query.isActive === true,
  });
  return plans.map(serializePlan);
}

async function getPlan(id) {
  const plan = await repo.findPlanById(id);
  if (!plan) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found");
  return serializePlan(plan);
}

async function createPlan({ code, displayName, coins, minutes, originalPrice, discountPercent, isActive, features }) {
  const existing = await repo.findPlanByCode(code);
  if (existing) throw new ApiError(HTTP_STATUS.CONFLICT, "A plan with this code already exists");

  const discount = discountPercent || 0;
  const priceAfterDiscount = computePriceAfterDiscount(originalPrice, discount);

  const plan = await repo.createPlan({
    code,
    displayName,
    coins,
    minutes,
    originalPrice,
    discountPercent: discount,
    priceAfterDiscount,
    priceCents: Math.round(priceAfterDiscount * 100), // keep legacy field in sync
    isActive: isActive ?? true,
    features: features || {},
  });
  return serializePlan(plan);
}

async function updatePlan(id, updates) {
  const existing = await repo.findPlanById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found");

  // Recompute priceAfterDiscount whenever either input to it changes
  const originalPrice = updates.originalPrice ?? existing.originalPrice;
  const discountPercent = updates.discountPercent ?? existing.discountPercent;
  const needsRecompute = updates.originalPrice !== undefined || updates.discountPercent !== undefined;

  const data = { ...updates };
  if (needsRecompute) {
    data.priceAfterDiscount = computePriceAfterDiscount(originalPrice, discountPercent);
    data.priceCents = Math.round(data.priceAfterDiscount * 100);
  }

  const plan = await repo.updatePlan(id, data);
  return serializePlan(plan);
}

async function setPlanActive(id, isActive) {
  const existing = await repo.findPlanById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found");

  const plan = await repo.setPlanActive(id, isActive);
  return serializePlan(plan);
}

async function listSubscriptions(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [subs, total] = await repo.listSubscriptions({
    userId: query.userId,
    planId: query.planId,
    isCurrent: query.isCurrent === undefined ? undefined : query.isCurrent === "true" || query.isCurrent === true,
    page,
    limit,
  });

  return {
    subscriptions: subs.map(serializeSubscription),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function assignSubscription({ userId, planId, expiresAt }, createdById) {
  const user = await usersRepo.findById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const plan = await repo.findPlanById(planId);
  if (!plan) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found");
  if (!plan.isActive) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Cannot assign an inactive plan");

  const sub = await repo.assignSubscription({
    userId,
    planId,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdById,
  });

  return {
    id: sub.id.toString(),
    plan: serializePlan(sub.plan),
    startedAt: sub.startedAt,
    expiresAt: sub.expiresAt,
  };
}

module.exports = { listPlans, getPlan, createPlan, updatePlan, setPlanActive, listSubscriptions, assignSubscription };