const crypto = require("crypto");
const repository = require("./banners.repository");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const { uploadBuffer, deleteImage } = require("../../utils/cloudinaryBuffer.util");
const {
  BANNER_STATUS,
  BANNER_STATUS_TRANSITIONS,
  BANNER_AUDIT_ACTION,
  BANNER_PRIORITY_LABEL_BUCKETS,
  BANNER_DISPLAY_CODE_PREFIX,
  BANNER_CATEGORY,
} = require("./banners.constants");

const CLOUDINARY_FOLDER = "lokalfrnd/banners";

function priorityLabel(priority) {
  const bucket = BANNER_PRIORITY_LABEL_BUCKETS.find((b) => priority <= b.max);
  return bucket ? bucket.label : "LOW";
}

function computeCtr(clicks, impressions) {
  const c = Number(clicks || 0);
  const i = Number(impressions || 0);
  if (i === 0) return 0;
  return Number(((c / i) * 100).toFixed(2));
}

function computeConversionRate(conversions, clicks) {
  const cv = Number(conversions || 0);
  const cl = Number(clicks || 0);
  if (cl === 0) return 0;
  return Number(((cv / cl) * 100).toFixed(2));
}

async function generateDisplayCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomInt(10000, 99999);
    const code = `${BANNER_DISPLAY_CODE_PREFIX}-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await repository.findByDisplayCode(code);
    if (!existing) return code;
  }
  throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to generate a unique banner code, please retry");
}

function decorateBanner(banner) {
  if (!banner) return banner;
  return {
    ...banner,
    priorityLabel: priorityLabel(banner.priority),
    ctr: computeCtr(banner.clicksCount, banner.impressionsCount),
    conversionRate: computeConversionRate(banner.conversionsCount, banner.clicksCount),
  };
}

async function createBanner(payload, file, adminId) {
  if (!file || !file.buffer) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Banner creative image is required");
  }

  const displayCode = await generateDisplayCode();

  const uploadResult = await uploadBuffer(file.buffer, {
    publicId: crypto.randomBytes(8).toString("hex"),
    folder: CLOUDINARY_FOLDER,
  });

  const banner = await repository.createBanner({
    ...payload,
    displayCode,
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
    createdByAdminId: adminId,
    updatedByAdminId: adminId,
  });

  await repository.createAuditLog({
    bannerId: banner.id,
    action: BANNER_AUDIT_ACTION.CREATED,
    performedByAdminId: adminId,
  });

  return decorateBanner(banner);
}

async function getBannerOr404(publicId, { includeDetails = false } = {}) {
  const banner = await repository.findByPublicId(publicId, { includeDetails });
  if (!banner) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Banner not found");
  }
  return banner;
}

async function getBannerDetails(publicId) {
  const banner = await getBannerOr404(publicId, { includeDetails: true });
  const auditLogs = await repository.listAuditLogs(banner.id);
  return { ...decorateBanner(banner), auditLogs };
}

async function listBanners(query) {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  const { items, total } = await repository.listBanners({ filters, page, limit, sortBy, sortOrder });

  return {
    items: items.map(decorateBanner),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function updateBanner(publicId, payload, file, adminId) {
  const existing = await getBannerOr404(publicId);

  const data = { ...payload, updatedByAdminId: adminId };

  if (file && file.buffer) {
    const uploadResult = await uploadBuffer(file.buffer, {
      publicId: crypto.randomBytes(8).toString("hex"),
      folder: CLOUDINARY_FOLDER,
    });
    data.imageUrl = uploadResult.secure_url;
    data.imagePublicId = uploadResult.public_id;

    if (existing.imagePublicId) {
      await deleteImage(existing.imagePublicId).catch(() => null);
    }
  }

  const updated = await repository.updateBanner(existing.id, data);

  await repository.createAuditLog({
    bannerId: existing.id,
    action: BANNER_AUDIT_ACTION.UPDATED,
    performedByAdminId: adminId,
  });

  return decorateBanner(updated);
}

async function changeStatus(publicId, newStatus, note, adminId) {
  const existing = await getBannerOr404(publicId);

  const allowed = BANNER_STATUS_TRANSITIONS[existing.status] || [];
  if (existing.status !== newStatus && !allowed.includes(newStatus)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Cannot move banner from ${existing.status} to ${newStatus}`
    );
  }

  const updated = await repository.updateBanner(existing.id, {
    status: newStatus,
    updatedByAdminId: adminId,
  });

  const actionMap = {
    ACTIVE: BANNER_AUDIT_ACTION.WENT_LIVE,
    PAUSED: BANNER_AUDIT_ACTION.PAUSED,
    EXPIRED: BANNER_AUDIT_ACTION.EXPIRED,
    ARCHIVED: BANNER_AUDIT_ACTION.ARCHIVED,
    SCHEDULED: BANNER_AUDIT_ACTION.SCHEDULED,
  };

  await repository.createAuditLog({
    bannerId: existing.id,
    action: actionMap[newStatus] || BANNER_AUDIT_ACTION.STATUS_CHANGED,
    note: note || null,
    performedByAdminId: adminId,
  });

  return decorateBanner(updated);
}

async function changePriority(publicId, priority, adminId) {
  const existing = await getBannerOr404(publicId);
  const updated = await repository.updateBanner(existing.id, { priority, updatedByAdminId: adminId });

  await repository.createAuditLog({
    bannerId: existing.id,
    action: BANNER_AUDIT_ACTION.PRIORITY_CHANGED,
    note: `Priority changed from ${existing.priority} to ${priority}`,
    performedByAdminId: adminId,
  });

  return decorateBanner(updated);
}

async function scheduleBanner(publicId, startAt, endAt, adminId) {
  const existing = await getBannerOr404(publicId);
  const updated = await repository.updateBanner(existing.id, {
    startAt,
    endAt,
    status: existing.status === BANNER_STATUS.DRAFT ? BANNER_STATUS.SCHEDULED : existing.status,
    updatedByAdminId: adminId,
  });

  await repository.createAuditLog({
    bannerId: existing.id,
    action: BANNER_AUDIT_ACTION.SCHEDULED,
    note: `Scheduled ${startAt} to ${endAt}`,
    performedByAdminId: adminId,
  });

  return decorateBanner(updated);
}

async function approveAssets(publicId, adminId, note) {
  const existing = await getBannerOr404(publicId);

  await repository.createAuditLog({
    bannerId: existing.id,
    action: BANNER_AUDIT_ACTION.ASSETS_APPROVED,
    note: note || null,
    performedByAdminId: adminId,
  });

  return decorateBanner(existing);
}

async function deleteBanner(publicId, adminId) {
  const existing = await getBannerOr404(publicId);
  const deleted = await repository.softDeleteBanner(existing.id);

  await repository.createAuditLog({
    bannerId: existing.id,
    action: BANNER_AUDIT_ACTION.DELETED,
    performedByAdminId: adminId,
  });

  return decorateBanner(deleted);
}

// Sequential loops used intentionally instead of Promise.all — consistent
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

async function bulkDelete(publicIds, adminId) {
  const results = [];
  for (const publicId of publicIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await deleteBanner(publicId, adminId);
      results.push({ publicId, success: true });
    } catch (error) {
      results.push({ publicId, success: false, error: error.message });
    }
  }
  return results;
}

async function getSummary(bannerType) {
  const stats = await repository.getSummaryStats(bannerType);
  return {
    ...stats,
    ctr: computeCtr(stats.totalClicks, stats.totalImpressions),
  };
}

async function getEngagementDistribution(bannerType) {
  const rows = await repository.getEngagementDistribution(bannerType);
  const totalClicks = rows.reduce((sum, r) => sum + Number(r._sum.clicksCount || 0), 0);

  return rows.map((row) => ({
    category: row.category || BANNER_CATEGORY.OTHER,
    clicks: row._sum.clicksCount || 0n,
    impressions: row._sum.impressionsCount || 0n,
    percentage:
      totalClicks === 0
        ? 0
        : Number(((Number(row._sum.clicksCount || 0) / totalClicks) * 100).toFixed(1)),
  }));
}

async function getTopPerforming(bannerType, limit) {
  const rows = await repository.getTopPerforming(bannerType, limit);
  return rows.map((row) => ({
    ...row,
    ctr: computeCtr(row.clicksCount, row.impressionsCount),
  }));
}

async function getActiveBanners(query) {
  return repository.listActiveBanners(query);
}

async function trackImpression(publicId) {
  const existing = await getBannerOr404(publicId);
  await repository.incrementImpressions(existing.id);
  return { tracked: true };
}

async function trackClick(publicId) {
  const existing = await getBannerOr404(publicId);
  await repository.incrementClicks(existing.id);
  return { tracked: true, deepLink: existing.deepLink };
}

module.exports = {
  createBanner,
  getBannerDetails,
  listBanners,
  updateBanner,
  changeStatus,
  changePriority,
  scheduleBanner,
  approveAssets,
  deleteBanner,
  bulkChangeStatus,
  bulkDelete,
  getSummary,
  getEngagementDistribution,
  getTopPerforming,
  getActiveBanners,
  trackImpression,
  trackClick,
};