const crypto = require("crypto");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./offers.repository");
const { uploadBuffer, deleteImage } = require("../../utils/cloudinaryBuffer.util");
const {
  OFFER_STATUS,
  OFFER_STATUS_TRANSITIONS,
  OFFER_AUDIT_ACTION,
  OFFER_DISPLAY_CODE_PREFIX,
} = require("./offers.constants");

const CLOUDINARY_FOLDER = "lokalfrnd/recharge-offers";

async function generateDisplayCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomInt(10000, 99999);
    const code = `${OFFER_DISPLAY_CODE_PREFIX}-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await repo.findOfferByDisplayCode(code);
    if (!existing) return code;
  }
  throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to generate a unique offer code, please retry");
}

function computeConversion(redemptions, clicks) {
  const r = Number(redemptions || 0);
  const c = Number(clicks || 0);
  if (c === 0) return 0;
  return Number(((r / c) * 100).toFixed(2));
}

function computeRoi(revenueGenerated, discountValue, redemptions) {
  // Rough ROI proxy: revenue generated vs. estimated discount cost given out.
  const revenue = Number(revenueGenerated || 0);
  const estimatedCost = Number(discountValue || 0) * Number(redemptions || 0);
  if (estimatedCost <= 0) return revenue > 0 ? 1 : 0;
  return Number((revenue / estimatedCost).toFixed(2));
}

function deriveStatus(offer) {
  // status is admin-controlled (DRAFT/PAUSED explicitly), but ACTIVE/SCHEDULED/EXPIRED
  // auto-resolve against the current time so a screen refresh never shows a stale badge.
  if (offer.status === OFFER_STATUS.DRAFT || offer.isPaused) return offer.status;

  const now = new Date();
  if (offer.endAt && offer.endAt < now) return OFFER_STATUS.EXPIRED;
  if (offer.startAt && offer.startAt > now) return OFFER_STATUS.SCHEDULED;
  return OFFER_STATUS.ACTIVE;
}

function serializeOffer(o) {
  if (!o) return o;
  const effectiveStatus = deriveStatus(o);
  return {
    id: o.id.toString(),
    publicId: o.publicId,
    displayCode: o.displayCode,
    name: o.name,
    description: o.description,
    offerType: o.offerType,
    discountType: o.discountType,
    discountValue: o.discountValue,
    couponCode: o.couponCode,
    bannerImageUrl: o.bannerImageUrl,
    applicableToAll: o.applicableToAll,
    applicablePlanIds: o.applicablePlanIds,
    minPurchaseAmount: o.minPurchaseAmount,
    maxRedemptions: o.maxRedemptions,
    maxRedemptionsPerUser: o.maxRedemptionsPerUser,
    status: effectiveStatus,
    isPaused: o.isPaused,
    startAt: o.startAt,
    endAt: o.endAt,
    analytics:
      o.redemptionsCount !== undefined
        ? {
            viewsCount: o.viewsCount,
            clicksCount: o.clicksCount,
            redemptionsCount: o.redemptionsCount,
            revenueGenerated: o.revenueGenerated,
            bonusCoinsIssued: o.bonusCoinsIssued ? o.bonusCoinsIssued.toString() : "0",
            conversionRate: computeConversion(o.redemptionsCount, o.clicksCount),
            roi: computeRoi(o.revenueGenerated, o.discountValue, o.redemptionsCount),
          }
        : undefined,
    createdBy: o.createdBy ? { id: o.createdBy.id.toString(), fullName: o.createdBy.fullName } : undefined,
    updatedBy: o.updatedBy ? { id: o.updatedBy.id.toString(), fullName: o.updatedBy.fullName } : undefined,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeAuditLog(log) {
  return {
    id: log.id.toString(),
    action: log.action,
    note: log.note,
    performedBy: log.performedByAdmin
      ? { id: log.performedByAdmin.id.toString(), fullName: log.performedByAdmin.fullName }
      : { fullName: "System" },
    createdAt: log.createdAt,
  };
}

async function getOfferOr404(publicId, opts) {
  const offer = await repo.findOfferByPublicId(publicId, opts);
  if (!offer) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Offer not found");
  return offer;
}

async function listOffers(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 100);
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  const [items, total] = await repo.listOffers({
    filters: {
      offerType: query.offerType,
      status: query.status,
      discountType: query.discountType,
      search: query.search,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    },
    page,
    limit,
    sortBy,
    sortOrder,
  });

  return {
    offers: items.map(serializeOffer),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getOfferDetails(publicId) {
  const offer = await getOfferOr404(publicId, { includeDetails: true });
  const auditLogs = await repo.listAuditLogs(offer.id);
  return { ...serializeOffer(offer), auditLogs: auditLogs.map(serializeAuditLog) };
}

async function createOffer(payload, file, adminId) {
  const existingCoupon = await repo.findOfferByCouponCode(payload.couponCode);
  if (existingCoupon) throw new ApiError(HTTP_STATUS.CONFLICT, "This coupon code is already in use");

  const displayCode = await generateDisplayCode();

  let bannerImageUrl;
  let bannerImagePublicId;
  if (file && file.buffer) {
    const uploaded = await uploadBuffer(file.buffer, {
      publicId: crypto.randomBytes(8).toString("hex"),
      folder: CLOUDINARY_FOLDER,
    });
    bannerImageUrl = uploaded.secure_url;
    bannerImagePublicId = uploaded.public_id;
  }

  const status = payload.startAt && new Date(payload.startAt) > new Date() ? OFFER_STATUS.SCHEDULED : payload.status || OFFER_STATUS.ACTIVE;

  const offer = await repo.createOffer({
    ...payload,
    couponCode: payload.couponCode.toUpperCase(),
    displayCode,
    bannerImageUrl,
    bannerImagePublicId,
    status,
    createdById: adminId,
    updatedById: adminId,
  });

  await repo.createAuditLog({
    offerId: offer.id,
    action: OFFER_AUDIT_ACTION.CREATED,
    note: `"${offer.name}" created by Admin`,
    performedByAdminId: adminId,
  });

  return serializeOffer(offer);
}

async function updateOffer(publicId, payload, file, adminId) {
  const existing = await getOfferOr404(publicId);

  if (payload.couponCode && payload.couponCode.toUpperCase() !== existing.couponCode) {
    const clash = await repo.findOfferByCouponCode(payload.couponCode);
    if (clash) throw new ApiError(HTTP_STATUS.CONFLICT, "This coupon code is already in use");
  }

  const data = { ...payload, updatedById: adminId };
  if (data.couponCode) data.couponCode = data.couponCode.toUpperCase();

  if (file && file.buffer) {
    const uploaded = await uploadBuffer(file.buffer, {
      publicId: crypto.randomBytes(8).toString("hex"),
      folder: CLOUDINARY_FOLDER,
    });
    data.bannerImageUrl = uploaded.secure_url;
    data.bannerImagePublicId = uploaded.public_id;
    if (existing.bannerImagePublicId) await deleteImage(existing.bannerImagePublicId);
  }

  const offer = await repo.updateOffer(existing.id, data);

  await repo.createAuditLog({
    offerId: offer.id,
    action: OFFER_AUDIT_ACTION.UPDATED,
    note: "Details updated",
    performedByAdminId: adminId,
  });

  return serializeOffer(offer);
}

async function changeStatus(publicId, newStatus, note, adminId) {
  const existing = await getOfferOr404(publicId);
  const currentStatus = deriveStatus(existing);

  const allowed = OFFER_STATUS_TRANSITIONS[currentStatus] || [];
  if (currentStatus !== newStatus && !allowed.includes(newStatus)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Cannot move offer from ${currentStatus} to ${newStatus}`);
  }

  const data = { updatedById: adminId };
  if (newStatus === OFFER_STATUS.PAUSED) data.isPaused = true;
  else if (existing.isPaused) data.isPaused = false;
  if (newStatus !== OFFER_STATUS.PAUSED) data.status = newStatus;

  const updated = await repo.updateOffer(existing.id, data);

  const actionMap = {
    ACTIVE: OFFER_AUDIT_ACTION.WENT_LIVE,
    PAUSED: OFFER_AUDIT_ACTION.PAUSED,
    EXPIRED: OFFER_AUDIT_ACTION.EXPIRED,
    SCHEDULED: OFFER_AUDIT_ACTION.SCHEDULED,
  };

  await repo.createAuditLog({
    offerId: existing.id,
    action: actionMap[newStatus] || OFFER_AUDIT_ACTION.STATUS_CHANGED,
    note: note || `Status changed to ${newStatus}`,
    performedByAdminId: adminId,
  });

  return serializeOffer(updated);
}

async function deleteOffer(publicId, adminId) {
  const existing = await getOfferOr404(publicId);
  const deleted = await repo.softDeleteOffer(existing.id);

  await repo.createAuditLog({
    offerId: existing.id,
    action: OFFER_AUDIT_ACTION.DELETED,
    performedByAdminId: adminId,
  });

  return serializeOffer(deleted);
}

// Sequential loop used intentionally instead of Promise.all — consistent
// with the rest of this project's bulk-operation pattern (avoids races).
async function bulkChangeStatus(publicIds, status, adminId) {
  const results = [];
  for (const publicId of publicIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const updated = await changeStatus(publicId, status, "Bulk update", adminId);
      results.push({ publicId, success: true, status: updated.status });
    } catch (error) {
      results.push({ publicId, success: false, error: error.message });
    }
  }
  return results;
}

async function getDashboard() {
  const summary = await repo.getDashboardSummary();
  const redemptions = await repo.getDailyRedemptions(7);
  const recentActivity = await repo.getRecentAuditActivity(10);

  const dayBuckets = {};
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = 0;
  }
  redemptions.forEach((r) => {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (dayBuckets[key] !== undefined) dayBuckets[key] += 1;
  });

  return {
    summary,
    dailyRedemptions: Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
    recentActivity: recentActivity.map((log) => ({
      id: log.id.toString(),
      action: log.action,
      note: log.note,
      offerName: log.offer.name,
      performedBy: log.performedByAdmin ? log.performedByAdmin.fullName : "System",
      createdAt: log.createdAt,
    })),
  };
}

async function trackClick(publicId) {
  const existing = await getOfferOr404(publicId);
  await repo.incrementClicks(existing.id);
  return { tracked: true };
}

module.exports = {
  listOffers,
  getOfferDetails,
  createOffer,
  updateOffer,
  changeStatus,
  deleteOffer,
  bulkChangeStatus,
  getDashboard,
  trackClick,
};