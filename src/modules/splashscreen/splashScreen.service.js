// src/modules/splashscreen/splashScreen.service.js
const crypto = require('crypto');
const repo = require('./splashScreen.repository');
const ApiError = require('../../utils/apiError.util'); // default export, not { ApiError }
const { HTTP_STATUS } = require('../../constants');
const { uploadBuffer, deleteImage } = require('../../utils/cloudinaryBuffer.util');
const {
  SPLASH_STATUS,
  SPLASH_STATUS_TRANSITIONS,
  SPLASH_BULK_ACTIONS,
  SPLASH_ACTIVITY_ACTION,
  SPLASH_CLOUDINARY_FOLDER,
  SPLASH_SCREEN_TYPE,
  SPLASH_PLATFORM,
  SPLASH_ANALYTICS_DEFAULT_RANGE_DAYS,
} = require('./splashScreen.constants');

function serialize(splash) {
  if (!splash) return null;
  return {
    id: splash.publicId,
    displayCode: splash.displayCode,
    name: splash.name,
    screenType: splash.screenType,
    campaign: splash.campaign,
    platform: splash.platform,
    appVersion: splash.appVersion,
    priority: splash.priority,
    status: splash.status,
    thumbnailUrl: splash.thumbnailUrl,
    resolution:
      splash.resolutionW && splash.resolutionH
        ? `${splash.resolutionW} x ${splash.resolutionH} px`
        : null,
    durationSec: splash.durationSec,
    sizeKb: splash.sizeKb,
    format: splash.format,
    startAt: splash.startAt,
    endAt: splash.endAt,
    totalViews: splash.totalViews?.toString?.() ?? splash.totalViews,
    createdBy: splash.createdBy
      ? {
          id: splash.createdBy.id?.toString?.(),
          // FIX: Admin model field is `fullName`, not `name`
          fullName: splash.createdBy.fullName,
          email: splash.createdBy.email,
        }
      : undefined,
    createdAt: splash.createdAt,
    updatedAt: splash.updatedAt,
  };
}

async function getOrThrow(id) {
  const splash = await repo.findByIdentifier(id);
  if (!splash) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Splash screen not found');
  }
  return splash;
}

async function listSplashScreens(query) {
  const { page, limit, search, screenType, status, platform, appVersion, campaign, sortBy, sortOrder } = query;

  const where = {
    ...(screenType && { screenType }),
    ...(status && { status }),
    ...(platform && { platform }),
    ...(appVersion && { appVersion: { contains: appVersion, mode: 'insensitive' } }),
    ...(campaign && { campaign: { contains: campaign, mode: 'insensitive' } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { displayCode: { contains: search, mode: 'insensitive' } },
        { campaign: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    repo.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    repo.count(where),
  ]);

  return {
    items: rows.map(serialize),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getStats() {
  return repo.getStats();
}

async function getSplashScreenById(id) {
  const splash = await getOrThrow(id);
  return serialize(splash);
}

async function createSplashScreen(body, file, adminId) {
  let thumbnailUrl;
  let thumbnailPublicId;
  let sizeKb;
  let format = body.format;

  if (file) {
    // Debug: confirms whether Multer actually received real bytes.
    // If bufferLength logs as 0 or 'NO BUFFER', the problem is the multer
    // middleware used on the route (needs memory storage), not this code.
    console.log('[splashScreen] thumbnail received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer ? file.buffer.length : 'NO BUFFER',
    });

    if (!file.buffer || file.buffer.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Uploaded thumbnail file is empty — please re-select the file and try again');
    }

    // publicId must be the hash-only identifier — folder handles the prefix.
    // Passing folder + a prefixed id together doubles the path on Cloudinary's side.
    const identifier = crypto.randomBytes(16).toString('hex');
    const uploadResult = await uploadBuffer(file.buffer, {
      folder: SPLASH_CLOUDINARY_FOLDER,
      publicId: identifier,
    });
    thumbnailUrl = uploadResult.secure_url;
    thumbnailPublicId = uploadResult.public_id;
    sizeKb = Math.round((file.size || uploadResult.bytes || 0) / 1024);
    if (!format) format = uploadResult.format;
  }

  const created = await repo.createWithUniqueDisplayCode({
    name: body.name,
    screenType: body.screenType,
    campaign: body.campaign || null,
    platform: body.platform,
    appVersion: body.appVersion || null,
    priority: body.priority,
    status: body.status,
    resolutionW: body.resolutionW,
    resolutionH: body.resolutionH,
    durationSec: body.durationSec,
    format,
    sizeKb,
    thumbnailUrl,
    thumbnailPublicId,
    startAt: body.startAt ? new Date(body.startAt) : null,
    endAt: body.endAt ? new Date(body.endAt) : null,
    createdById: adminId,
  });

  await repo.addActivityLog({
    splashScreenId: created.id,
    action: SPLASH_ACTIVITY_ACTION.CREATED,
    toStatus: created.status,
    performedById: adminId,
  });

  return serialize(created);
}

async function updateSplashScreen(id, body, adminId) {
  const existing = await getOrThrow(id);

  const updated = await repo.updateByPk(existing.id, {
    ...body,
    campaign: body.campaign ?? undefined,
  });

  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.UPDATED,
    performedById: adminId,
  });

  return serialize(updated);
}

async function deleteSplashScreen(id, adminId) {
  const existing = await getOrThrow(id);
  await repo.softDeleteByPk(existing.id);
  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.DELETED,
    fromStatus: existing.status,
    performedById: adminId,
  });
  return { success: true };
}

async function updateStatus(id, { status, reason }, adminId) {
  const existing = await getOrThrow(id);
  const allowed = SPLASH_STATUS_TRANSITIONS[existing.status] || [];

  if (existing.status !== status && !allowed.includes(status)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Cannot transition splash screen from '${existing.status}' to '${status}'`
    );
  }

  const updated = await repo.updateByPk(existing.id, { status });

  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.STATUS_CHANGED,
    fromStatus: existing.status,
    toStatus: status,
    note: reason,
    performedById: adminId,
  });

  return serialize(updated);
}

async function updateSchedule(id, { startAt, endAt }, adminId) {
  const existing = await getOrThrow(id);
  const updated = await repo.updateByPk(existing.id, {
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    status: existing.status === SPLASH_STATUS.DRAFT ? SPLASH_STATUS.SCHEDULED : existing.status,
  });

  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.SCHEDULED,
    note: `Scheduled ${startAt} to ${endAt}`,
    performedById: adminId,
  });

  return serialize(updated);
}

async function updatePriority(id, { priority }, adminId) {
  const existing = await getOrThrow(id);
  const updated = await repo.updateByPk(existing.id, { priority });

  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.PRIORITY_CHANGED,
    note: `Priority ${existing.priority} -> ${priority}`,
    performedById: adminId,
  });

  return serialize(updated);
}

async function bulkAction({ ids, action, reason }, adminId) {
  const rows = await repo.findManyByIdentifiers(ids);
  const results = [];

  for (const row of rows) {
    try {
      if (action === SPLASH_BULK_ACTIONS.ACTIVATE) {
        await repo.updateByPk(row.id, { status: SPLASH_STATUS.ACTIVE });
        await repo.addActivityLog({
          splashScreenId: row.id,
          action: SPLASH_ACTIVITY_ACTION.STATUS_CHANGED,
          fromStatus: row.status,
          toStatus: SPLASH_STATUS.ACTIVE,
          note: reason,
          performedById: adminId,
        });
      } else if (action === SPLASH_BULK_ACTIONS.DEACTIVATE) {
        await repo.updateByPk(row.id, { status: SPLASH_STATUS.EXPIRED });
        await repo.addActivityLog({
          splashScreenId: row.id,
          action: SPLASH_ACTIVITY_ACTION.STATUS_CHANGED,
          fromStatus: row.status,
          toStatus: SPLASH_STATUS.EXPIRED,
          note: reason,
          performedById: adminId,
        });
      } else if (action === SPLASH_BULK_ACTIONS.DELETE) {
        await repo.softDeleteByPk(row.id);
        await repo.addActivityLog({
          splashScreenId: row.id,
          action: SPLASH_ACTIVITY_ACTION.DELETED,
          fromStatus: row.status,
          note: reason,
          performedById: adminId,
        });
      }
      results.push({ id: row.publicId, success: true });
    } catch (err) {
      results.push({ id: row.publicId, success: false, error: err.message });
    }
  }

  return results;
}

async function uploadThumbnail(id, file, adminId) {
  const existing = await getOrThrow(id);

  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Uploaded thumbnail file is empty — please re-select the file and try again');
  }

  if (existing.thumbnailPublicId) {
    await deleteImage(existing.thumbnailPublicId);
  }

  const identifier = crypto.randomBytes(16).toString('hex');
  const uploadResult = await uploadBuffer(file.buffer, {
    folder: SPLASH_CLOUDINARY_FOLDER,
    publicId: identifier,
  });

  const updated = await repo.updateByPk(existing.id, {
    thumbnailUrl: uploadResult.secure_url,
    thumbnailPublicId: uploadResult.public_id,
    sizeKb: Math.round((file.size || uploadResult.bytes || 0) / 1024),
    format: uploadResult.format || existing.format,
  });

  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.THUMBNAIL_UPDATED,
    performedById: adminId,
  });

  return serialize(updated);
}

async function removeThumbnail(id, adminId) {
  const existing = await getOrThrow(id);

  if (existing.thumbnailPublicId) {
    await deleteImage(existing.thumbnailPublicId);
  }

  const updated = await repo.updateByPk(existing.id, {
    thumbnailUrl: null,
    thumbnailPublicId: null,
  });

  await repo.addActivityLog({
    splashScreenId: existing.id,
    action: SPLASH_ACTIVITY_ACTION.THUMBNAIL_UPDATED,
    note: 'Thumbnail removed',
    performedById: adminId,
  });

  return serialize(updated);
}

async function getDailyViews(id, range = SPLASH_ANALYTICS_DEFAULT_RANGE_DAYS) {
  const existing = await getOrThrow(id);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - range);
  fromDate.setHours(0, 0, 0, 0);

  const rows = await repo.getDailyViews(existing.id, fromDate);
  return rows.map((r) => ({
    date: r.viewDate,
    views: r.viewCount?.toString?.() ?? r.viewCount,
  }));
}

async function getTypeDistribution() {
  const grouped = await repo.getTypeDistribution();
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0) || 1;

  const distribution = Object.values(SPLASH_SCREEN_TYPE).map((type) => {
    const match = grouped.find((g) => g.screenType === type);
    const count = match?._count?._all || 0;
    return {
      type,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });

  return distribution;
}

async function getActivityTimeline(id, { page = 1, limit = 20 } = {}) {
  const existing = await getOrThrow(id);
  const rows = await repo.listActivityLogs(existing.id, {
    skip: (page - 1) * limit,
    take: limit,
  });

  return rows.map((r) => ({
    id: r.publicId,
    action: r.action,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    note: r.note,
    // FIX: Admin model field is `fullName`, not `name`
    performedBy: r.performedBy ? { fullName: r.performedBy.fullName, email: r.performedBy.email } : undefined,
    createdAt: r.createdAt,
  }));
}

function getFilterMeta() {
  return {
    screenTypes: Object.values(SPLASH_SCREEN_TYPE),
    statuses: Object.values(SPLASH_STATUS),
    platforms: Object.values(SPLASH_PLATFORM),
    // appVersions typically pulled distinct from DB; simple fallback list below
    appVersions: ['v3.0.0+', 'v3.1.0+', 'v3.1.5+', 'v3.2.0+'],
  };
}

module.exports = {
  serialize,
  listSplashScreens,
  getStats,
  getSplashScreenById,
  createSplashScreen,
  updateSplashScreen,
  deleteSplashScreen,
  updateStatus,
  updateSchedule,
  updatePriority,
  bulkAction,
  uploadThumbnail,
  removeThumbnail,
  getDailyViews,
  getTypeDistribution,
  getActivityTimeline,
  getFilterMeta,
};