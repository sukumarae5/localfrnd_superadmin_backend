const crypto = require("crypto");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./plans.repository");
const usersRepo = require("../users/users.repository");
const offersRepo = require("../offers/offers.repository");
const { uploadBuffer, deleteImage } = require("../../utils/cloudinaryBuffer.util");
const { PLAN_DISPLAY_CODE_PREFIX, PLAN_AUDIT_ACTION, PLAN_PRICE_FIELDS } = require("./plans.constants");

const ICON_FOLDER = "lokalfrnd/recharge-plans/icons";
const BANNER_FOLDER = "lokalfrnd/recharge-plans/banners";

function computePriceAfterDiscount(originalPrice, discountPercent) {
  const discounted = Number(originalPrice) * (1 - Number(discountPercent) / 100);
  return Math.round(discounted * 100) / 100; // round to 2 decimals
}

async function generateDisplayCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomInt(1000, 9999);
    const code = `${PLAN_DISPLAY_CODE_PREFIX}-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await repo.findPlanByDisplayCode(code);
    if (!existing) return code;
  }
  throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to generate a unique plan code, please retry");
}

function serializePlan(p) {
  if (!p) return p;
  const valuePerCoin = p.coins > 0 ? Number((Number(p.priceAfterDiscount) / p.coins).toFixed(2)) : 0;
  const conversionRate = p.viewsCount > 0 ? Number(((p.purchasesCount / p.viewsCount) * 100).toFixed(2)) : 0;
  const refundRate = p.purchasesCount > 0 ? Number(((p.refundsCount / p.purchasesCount) * 100).toFixed(2)) : 0;

  return {
    id: p.id,
    publicId: p.publicId,
    displayCode: p.displayCode,
    code: p.code,
    displayName: p.displayName,
    shortDescription: p.shortDescription,
    detailedDescription: p.detailedDescription,
    planType: p.planType,
    badgeText: p.badgeText,
    iconUrl: p.iconUrl,
    bannerImageUrl: p.bannerImageUrl,
    themeColor: p.themeColor,
    coins: p.coins,
    baseCoins: p.baseCoins,
    bonusCoins: p.bonusCoins,
    minutes: p.minutes,
    validityDays: p.validityDays,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
    priceAfterDiscount: p.priceAfterDiscount,
    valuePerCoin,
    displayPriority: p.displayPriority,
    isFeatured: p.isFeatured,
    isPremiumBadge: p.isPremiumBadge,
    cashbackEnabled: p.cashbackEnabled,
    features: p.features,
    isActive: p.isActive,
    isDraft: p.isDraft,
    analytics:
      p.viewsCount !== undefined
        ? {
            viewsCount: p.viewsCount,
            purchasesCount: p.purchasesCount,
            refundsCount: p.refundsCount,
            revenueTotal: p.revenueTotal,
            conversionRate,
            refundRate,
          }
        : undefined,
    createdBy: p.createdBy ? { id: p.createdBy.id.toString(), fullName: p.createdBy.fullName } : undefined,
    updatedBy: p.updatedBy ? { id: p.updatedBy.id.toString(), fullName: p.updatedBy.fullName } : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function serializeSubscription(s) {
  return {
    id: s.id.toString(),
    userId: s.user.id.toString(),
    userName: s.user.fullName,
    userDisplayCode: s.user.displayCode,
    plan: serializePlan(s.plan),
    pricePaid: s.pricePaid,
    paymentMethod: s.paymentMethod,
    couponCode: s.couponCode,
    isRefunded: s.isRefunded,
    startedAt: s.startedAt,
    expiresAt: s.expiresAt,
    isCurrent: s.isCurrent,
  };
}

function serializeAuditLog(log) {
  return {
    id: log.id.toString(),
    action: log.action,
    note: log.note,
    changes: log.changes,
    performedBy: log.performedByAdmin
      ? { id: log.performedByAdmin.id.toString(), fullName: log.performedByAdmin.fullName }
      : { fullName: "System" },
    createdAt: log.createdAt,
  };
}

function diffChanges(existing, updates, fields) {
  const changes = {};
  for (const field of fields) {
    if (updates[field] !== undefined && String(updates[field]) !== String(existing[field])) {
      changes[field] = { from: existing[field], to: updates[field] };
    }
  }
  return changes;
}

async function listPlans(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 100);
  const sortBy = query.sortBy || "displayPriority";
  const sortOrder = query.sortOrder || "asc";

  const [items, total] = await repo.listPlans({
    filters: {
      isActive: query.isActive,
      isDraft: query.isDraft,
      planType: query.planType,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minCoins: query.minCoins,
      maxCoins: query.maxCoins,
      validityDays: query.validityDays,
    },
    page,
    limit,
    sortBy,
    sortOrder,
  });

  return {
    plans: items.map(serializePlan),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getPlanOr404(publicId, opts) {
  const plan = await repo.findPlanByPublicId(publicId, opts);
  if (!plan) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found");
  return plan;
}

async function getPlan(publicId) {
  const plan = await getPlanOr404(publicId, { includeAudit: true });
  return serializePlan(plan);
}

async function getPlanDetails(publicId) {
  const plan = await getPlanOr404(publicId, { includeAudit: true });
  const auditLogs = await repo.listAuditLogs(plan.id);
  return { ...serializePlan(plan), auditLogs: auditLogs.map(serializeAuditLog) };
}

async function uploadPlanAssets({ icon, banner }) {
  const result = {};
  if (icon && icon.buffer) {
    const uploaded = await uploadBuffer(icon.buffer, {
      publicId: crypto.randomBytes(8).toString("hex"),
      folder: ICON_FOLDER,
    });
    result.iconUrl = uploaded.secure_url;
    result.iconPublicId = uploaded.public_id;
  }
  if (banner && banner.buffer) {
    const uploaded = await uploadBuffer(banner.buffer, {
      publicId: crypto.randomBytes(8).toString("hex"),
      folder: BANNER_FOLDER,
    });
    result.bannerImageUrl = uploaded.secure_url;
    result.bannerImagePublicId = uploaded.public_id;
  }
  return result;
}

async function createPlan(payload, files, adminId) {
  const { code, displayName, baseCoins = 0, bonusCoins = 0, originalPrice, discountPercent, isDraft } = payload;

  const existing = await repo.findPlanByCode(code);
  if (existing) throw new ApiError(HTTP_STATUS.CONFLICT, "A plan with this code already exists");

  const discount = discountPercent || 0;
  const priceAfterDiscount = computePriceAfterDiscount(originalPrice, discount);
  const displayCode = await generateDisplayCode();
  const assets = await uploadPlanAssets({ icon: files?.icon?.[0], banner: files?.banner?.[0] });

  const plan = await repo.createPlan({
    ...payload,
    displayCode,
    baseCoins,
    bonusCoins,
    coins: baseCoins + bonusCoins,
    discountPercent: discount,
    priceAfterDiscount,
    priceCents: Math.round(priceAfterDiscount * 100), // keep legacy field in sync
    isActive: isDraft ? false : payload.isActive ?? true,
    isDraft: !!isDraft,
    features: payload.features || {},
    ...assets,
    createdById: adminId,
    updatedById: adminId,
  });

  await repo.createAuditLog({
    planId: plan.id,
    action: isDraft ? PLAN_AUDIT_ACTION.DRAFT_SAVED : PLAN_AUDIT_ACTION.CREATED,
    note: isDraft ? "Plan saved as draft" : "Plan created",
    performedByAdminId: adminId,
  });

  return serializePlan(plan);
}

async function updatePlan(publicId, updates, files, adminId) {
  const existing = await getPlanOr404(publicId);

  const originalPrice = updates.originalPrice ?? existing.originalPrice;
  const discountPercent = updates.discountPercent ?? existing.discountPercent;
  const needsRecompute = updates.originalPrice !== undefined || updates.discountPercent !== undefined;

  const data = { ...updates, updatedById: adminId };

  if (updates.baseCoins !== undefined || updates.bonusCoins !== undefined) {
    const baseCoins = updates.baseCoins ?? existing.baseCoins;
    const bonusCoins = updates.bonusCoins ?? existing.bonusCoins;
    data.coins = baseCoins + bonusCoins;
  }

  if (needsRecompute) {
    data.priceAfterDiscount = computePriceAfterDiscount(originalPrice, discountPercent);
    data.priceCents = Math.round(data.priceAfterDiscount * 100);
  }

  const assets = await uploadPlanAssets({ icon: files?.icon?.[0], banner: files?.banner?.[0] });
  Object.assign(data, assets);

  const priceChanges = diffChanges(existing, updates, PLAN_PRICE_FIELDS);
  const allChanges = diffChanges(existing, updates, Object.keys(updates));

  const plan = await repo.updatePlan(existing.id, data);

  if (assets.iconUrl && existing.iconPublicId) await deleteImage(existing.iconPublicId);
  if (assets.bannerImageUrl && existing.bannerImagePublicId) await deleteImage(existing.bannerImagePublicId);

  await repo.createAuditLog({
    planId: plan.id,
    action: Object.keys(priceChanges).length ? PLAN_AUDIT_ACTION.PRICE_UPDATED : PLAN_AUDIT_ACTION.UPDATED,
    note: Object.keys(priceChanges).length ? "Price updated by Admin" : "Plan details updated",
    changes: allChanges,
    performedByAdminId: adminId,
  });

  return serializePlan(plan);
}

async function setPlanActive(publicId, isActive, adminId) {
  const existing = await getPlanOr404(publicId);
  const plan = await repo.setPlanActive(existing.id, isActive);

  await repo.createAuditLog({
    planId: plan.id,
    action: PLAN_AUDIT_ACTION.STATUS_CHANGED,
    note: `Plan marked ${isActive ? "Active" : "Inactive"}`,
    performedByAdminId: adminId,
  });

  return serializePlan(plan);
}

async function publishPlan(publicId, adminId) {
  const existing = await getPlanOr404(publicId);
  const plan = await repo.updatePlan(existing.id, { isDraft: false, isActive: true, updatedById: adminId });

  await repo.createAuditLog({
    planId: plan.id,
    action: PLAN_AUDIT_ACTION.PUBLISHED,
    note: "Plan published live",
    performedByAdminId: adminId,
  });

  return serializePlan(plan);
}

async function duplicatePlan(publicId, adminId) {
  const existing = await getPlanOr404(publicId);
  const displayCode = await generateDisplayCode();

  let code = `${existing.code}-COPY`;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await repo.findPlanByCode(code)) {
    suffix += 1;
    code = `${existing.code}-COPY${suffix}`;
  }

  const clone = await repo.createPlan({
    code,
    displayCode,
    displayName: `${existing.displayName} (Copy)`,
    shortDescription: existing.shortDescription,
    detailedDescription: existing.detailedDescription,
    planType: existing.planType,
    badgeText: existing.badgeText,
    themeColor: existing.themeColor,
    baseCoins: existing.baseCoins,
    bonusCoins: existing.bonusCoins,
    coins: existing.coins,
    minutes: existing.minutes,
    validityDays: existing.validityDays,
    originalPrice: existing.originalPrice,
    discountPercent: existing.discountPercent,
    priceAfterDiscount: existing.priceAfterDiscount,
    priceCents: existing.priceCents,
    displayPriority: existing.displayPriority,
    isFeatured: existing.isFeatured,
    isPremiumBadge: existing.isPremiumBadge,
    cashbackEnabled: existing.cashbackEnabled,
    features: existing.features,
    isActive: false,
    isDraft: true, // duplicates always land in draft so admins review before publishing
    createdById: adminId,
    updatedById: adminId,
  });

  await repo.createAuditLog({
    planId: clone.id,
    action: PLAN_AUDIT_ACTION.DUPLICATED,
    note: `Duplicated from ${existing.displayCode}`,
    performedByAdminId: adminId,
  });

  return serializePlan(clone);
}

async function deletePlan(publicId, adminId) {
  const existing = await getPlanOr404(publicId);
  const deleted = await repo.softDeletePlan(existing.id);

  await repo.createAuditLog({
    planId: existing.id,
    action: PLAN_AUDIT_ACTION.DELETED,
    performedByAdminId: adminId,
  });

  return serializePlan(deleted);
}

async function recordView(publicId) {
  const existing = await getPlanOr404(publicId);
  await repo.incrementViews(existing.id);
  return { tracked: true };
}

// ---- Dashboard / analytics ----

async function getDashboard() {
  const summary = await repo.getDashboardSummary();
  const topSelling = await repo.getTopSellingPlans(5);
  const recentPurchases = await repo.getRecentPurchases(5);
  const [today, week, month, lifetime] = await repo.getRevenueSummary();

  return {
    summary,
    topSellingPlans: topSelling.map((p) => ({
      id: p.id,
      displayCode: p.displayCode,
      displayName: p.displayName,
      purchasesCount: p.purchasesCount,
      revenueTotal: p.revenueTotal,
    })),
    recentPurchases: recentPurchases.map((s) => ({
      id: s.id.toString(),
      userName: s.user.fullName,
      userDisplayCode: s.user.displayCode,
      planName: s.plan.displayName,
      pricePaid: s.pricePaid,
      createdAt: s.createdAt,
    })),
    revenueSummary: {
      today: today._sum.pricePaid || 0,
      weekly: week._sum.pricePaid || 0,
      monthly: month._sum.pricePaid || 0,
      lifetime: lifetime._sum.pricePaid || 0,
    },
  };
}

// ---- Purchases ----

async function purchasePlan({ userId, planPublicId, couponCode, paymentMethod }) {
  const plan = await repo.findPlanByPublicId(planPublicId);
  if (!plan) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found");
  if (!plan.isActive || plan.isDraft) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This plan is not available for purchase");

  let offer = null;
  let discountAppliedAmount = 0;
  let bonusCoinsFromOffer = 0;
  let pricePaid = Number(plan.priceAfterDiscount);

  if (couponCode) {
    offer = await offersRepo.findOfferByCouponCode(couponCode);
    if (!offer || offer.isDeleted) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Coupon code not found");

    const now = new Date();
    const isWithinWindow = (!offer.startAt || offer.startAt <= now) && (!offer.endAt || offer.endAt >= now);
    if (offer.isPaused || !isWithinWindow || offer.status === "EXPIRED") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This coupon is not currently active");
    }
    if (offer.maxRedemptions && offer.redemptionsCount >= offer.maxRedemptions) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This coupon has reached its redemption limit");
    }
    if (!offer.applicableToAll && !offer.applicablePlanIds.includes(plan.id)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This coupon is not valid for the selected plan");
    }
    if (offer.minPurchaseAmount && pricePaid < Number(offer.minPurchaseAmount)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `This coupon requires a minimum purchase of ₹${offer.minPurchaseAmount}`);
    }

    if (offer.discountType === "PERCENTAGE") {
      discountAppliedAmount = Number(((pricePaid * Number(offer.discountValue)) / 100).toFixed(2));
      pricePaid = Math.max(0, Number((pricePaid - discountAppliedAmount).toFixed(2)));
    } else if (offer.discountType === "FLAT") {
      discountAppliedAmount = Math.min(pricePaid, Number(offer.discountValue));
      pricePaid = Math.max(0, Number((pricePaid - discountAppliedAmount).toFixed(2)));
    } else if (offer.discountType === "MULTIPLIER") {
      bonusCoinsFromOffer = plan.baseCoins * (Number(offer.discountValue) - 1);
    } else if (offer.discountType === "BONUS_COINS") {
      bonusCoinsFromOffer = Number(offer.discountValue);
    }

    offer.discountAppliedAmount = discountAppliedAmount;
  }

  const result = await repo.recordPurchase({
    userId,
    plan,
    offer,
    pricePaid,
    bonusCoinsFromOffer,
    paymentMethod,
    couponCode: offer ? offer.couponCode : undefined,
  }).catch((err) => {
    if (err.message === "WALLET_NOT_FOUND") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "User does not have a wallet set up yet");
    }
    throw err;
  });

  return {
    subscriptionId: result.subscription.id.toString(),
    plan: serializePlan(plan),
    pricePaid,
    discountApplied: discountAppliedAmount,
    bonusCoinsFromOffer,
    coinsCredited: plan.baseCoins + plan.bonusCoins + bonusCoinsFromOffer,
    walletBalance: result.wallet.balance,
    walletCoins: result.wallet.coins.toString(),
    couponApplied: offer ? offer.couponCode : null,
  };
}

async function refundPurchase(subscriptionId, adminId) {
  const updated = await repo.refundPurchase(subscriptionId, adminId).catch((err) => {
    if (err.message === "PURCHASE_NOT_FOUND") throw new ApiError(HTTP_STATUS.NOT_FOUND, "Purchase not found");
    if (err.message === "ALREADY_REFUNDED") throw new ApiError(HTTP_STATUS.CONFLICT, "This purchase was already refunded");
    throw err;
  });

  await repo.createAuditLog({
    planId: updated.planId,
    action: PLAN_AUDIT_ACTION.REFUNDED,
    note: `Purchase #${subscriptionId} refunded`,
    performedByAdminId: adminId,
  });

  return { id: updated.id.toString(), isRefunded: updated.isRefunded, refundedAt: updated.refundedAt };
}

// ---- Legacy subscription assignment (kept for backward compatibility) ----

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

module.exports = {
  listPlans,
  getPlan,
  getPlanDetails,
  createPlan,
  updatePlan,
  setPlanActive,
  publishPlan,
  duplicatePlan,
  deletePlan,
  recordView,
  getDashboard,
  purchasePlan,
  refundPurchase,
  listSubscriptions,
  assignSubscription,
};