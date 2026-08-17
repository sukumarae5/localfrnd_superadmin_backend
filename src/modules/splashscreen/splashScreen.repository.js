// src/modules/splashscreen/splashScreen.repository.js
const { prisma } = require('../../config/database');
const {
  SPLASH_DISPLAY_CODE_PREFIX,
  SPLASH_DISPLAY_CODE_MAX_RETRY,
  SPLASH_STATUS,
} = require('./splashScreen.constants');

const baseWhere = () => ({ deletedAt: null });

const resolveIdentifierWhere = (id) => {
  // Accept either numeric BigInt id or publicId (uuid)
  const isNumeric = /^\d+$/.test(id);
  return isNumeric ? { id: BigInt(id) } : { publicId: id };
};

function generateDisplayCodeCandidate() {
  const suffix = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 6);
  return `${SPLASH_DISPLAY_CODE_PREFIX}-${suffix}`;
}

async function createWithUniqueDisplayCode(data) {
  let attempt = 0;
  let lastError;
  while (attempt < SPLASH_DISPLAY_CODE_MAX_RETRY) {
    const displayCode = generateDisplayCodeCandidate();
    try {
      return await prisma.splashScreen.create({
        data: { ...data, displayCode },
      });
    } catch (err) {
      if (err.code === 'P2002' && err.meta?.target?.includes('display_code')) {
        attempt += 1;
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Failed to generate unique displayCode for splash screen');
}

async function findMany({ where, skip, take, orderBy }) {
  return prisma.splashScreen.findMany({
    where: { ...baseWhere(), ...where },
    skip,
    take,
    orderBy,
    include: {
  createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}

async function count(where) {
  return prisma.splashScreen.count({ where: { ...baseWhere(), ...where } });
}

async function findByIdentifier(id) {
  return prisma.splashScreen.findFirst({
    where: { ...baseWhere(), ...resolveIdentifierWhere(id) },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}

async function updateByPk(pkId, data) {
  return prisma.splashScreen.update({
    where: { id: pkId },
    data,
  });
}

async function softDeleteByPk(pkId) {
  return prisma.splashScreen.update({
    where: { id: pkId },
    data: { deletedAt: new Date() },
  });
}

async function getStats() {
  const [total, active, scheduled, expired, draft] = await Promise.all([
    prisma.splashScreen.count({ where: baseWhere() }),
    prisma.splashScreen.count({ where: { ...baseWhere(), status: SPLASH_STATUS.ACTIVE } }),
    prisma.splashScreen.count({ where: { ...baseWhere(), status: SPLASH_STATUS.SCHEDULED } }),
    prisma.splashScreen.count({ where: { ...baseWhere(), status: SPLASH_STATUS.EXPIRED } }),
    prisma.splashScreen.count({ where: { ...baseWhere(), status: SPLASH_STATUS.DRAFT } }),
  ]);
  return { total, active, scheduled, expired, draft };
}

async function getTypeDistribution() {
  const grouped = await prisma.splashScreen.groupBy({
    by: ['screenType'],
    where: baseWhere(),
    _count: { _all: true },
  });
  return grouped;
}

async function addActivityLog({ splashScreenId, action, fromStatus, toStatus, note, performedById }) {
  return prisma.splashScreenActivityLog.create({
    data: { splashScreenId, action, fromStatus, toStatus, note, performedById },
  });
}

async function listActivityLogs(splashScreenId, { skip = 0, take = 20 } = {}) {
  return prisma.splashScreenActivityLog.findMany({
    where: { splashScreenId },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      performedBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}

async function getDailyViews(splashScreenId, fromDate) {
  return prisma.splashScreenDailyView.findMany({
    where: {
      splashScreenId,
      viewDate: { gte: fromDate },
    },
    orderBy: { viewDate: 'asc' },
  });
}
  
async function upsertDailyView(splashScreenId, viewDate, incrementBy = 1) {
  return prisma.splashScreenDailyView.upsert({
    where: { splashScreenId_viewDate: { splashScreenId, viewDate } },
    update: { viewCount: { increment: incrementBy } },
    create: { splashScreenId, viewDate, viewCount: incrementBy },
  });
}

async function findManyByIdentifiers(ids) {
  const numericIds = ids.filter((v) => /^\d+$/.test(v)).map((v) => BigInt(v));
  const publicIds = ids.filter((v) => !/^\d+$/.test(v));
  return prisma.splashScreen.findMany({
    where: {
      ...baseWhere(),
      OR: [
        ...(numericIds.length ? [{ id: { in: numericIds } }] : []),
        ...(publicIds.length ? [{ publicId: { in: publicIds } }] : []),
      ],
    },
  });
}

module.exports = {
  resolveIdentifierWhere,
  createWithUniqueDisplayCode,
  findMany,
  count,
  findByIdentifier,
  updateByPk,
  softDeleteByPk,
  getStats,
  getTypeDistribution,
  addActivityLog,
  listActivityLogs,
  getDailyViews,
  upsertDailyView,
  findManyByIdentifiers,
};