// src/modules/rj/application/application.repository.js
const { prisma } = require("../../../config/database");

function buildWhere({ search, status, priority, categoryId, kycStatus, dateFrom, dateTo }) {
  const where = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;

  // "KYC Status" filter on the Figma screen maps to whether all docs are
  // verified yet, not a literal column — approximate via aadhaarMatch/panMatch.
  if (kycStatus === "verified") {
    where.aadhaarMatch = true;
    where.panMatch = true;
  } else if (kycStatus === "pending") {
    where.OR = [{ aadhaarMatch: false }, { panMatch: false }];
  }

  if (dateFrom || dateTo) {
    where.submittedAt = {};
    if (dateFrom) where.submittedAt.gte = dateFrom;
    if (dateTo) where.submittedAt.lte = dateTo;
  }

  if (search) {
    where.OR = [
      ...(where.OR || []),
      { appCode: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
      { user: { mobileNumber: { contains: search } } },
    ];
  }

  return where;
}

const listInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      mobileCountryCode: true,
      mobileNumber: true,
      displayCode: true,
    },
  },
  category: true,
};

const detailInclude = {
  ...listInclude,
  documents: { orderBy: { createdAt: "desc" } },
  reviewedBy: { select: { fullName: true } },
};

async function listApplications({ page, limit, search, status, priority, categoryId, kycStatus, dateFrom, dateTo, sortBy, sortOrder }) {
  const where = buildWhere({ search, status, priority, categoryId, kycStatus, dateFrom, dateTo });
  const skip = (page - 1) * limit;

  const [applications, total] = await prisma.$transaction([
    prisma.rJApplication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: listInclude,
    }),
    prisma.rJApplication.count({ where }),
  ]);

  return { applications, total };
}

// Stat cards: Total Applications / Pending Review / Approved Today /
// Rejected Today / Under Review / KYC Pending / Interview Pending / Avg Approval Time
async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    total,
    pendingReview,
    approvedToday,
    rejectedToday,
    underReview,
    kycPending,
    interviewPending,
  ] = await prisma.$transaction([
    prisma.rJApplication.count(),
    prisma.rJApplication.count({ where: { status: "pending" } }),
    prisma.rJApplication.count({ where: { status: "approved", reviewedAt: { gte: startOfToday } } }),
    prisma.rJApplication.count({ where: { status: "rejected", reviewedAt: { gte: startOfToday } } }),
    prisma.rJApplication.count({ where: { status: "under_review" } }),
    prisma.rJApplication.count({ where: { OR: [{ aadhaarMatch: false }, { panMatch: false }] } }),
    prisma.rJApplication.count({ where: { status: "interview_pending" } }),
  ]);

  // Avg approval time in hours, for applications decided so far
  const decided = await prisma.rJApplication.findMany({
    where: { reviewedAt: { not: null } },
    select: { submittedAt: true, reviewedAt: true },
  });
  const avgApprovalHours = decided.length
    ? decided.reduce((sum, a) => sum + (a.reviewedAt - a.submittedAt) / 3600000, 0) / decided.length
    : 0;

  return {
    total,
    pendingReview,
    approvedToday,
    rejectedToday,
    underReview,
    kycPending,
    interviewPending,
    avgApprovalHours: Number(avgApprovalHours.toFixed(1)),
  };
}

function findById(id) {
  return prisma.rJApplication.findUnique({
    where: { id: BigInt(id) },
    include: detailInclude,
  });
}

function findByAppCode(appCode) {
  return prisma.rJApplication.findUnique({
    where: { appCode },
    include: detailInclude,
  });
}

function findPendingByUserId(userId) {
  return prisma.rJApplication.findFirst({
    where: { userId: BigInt(userId), status: { in: ["pending", "under_review", "interview_pending"] } },
  });
}

function createApplication(data) {
  return prisma.rJApplication.create({ data, include: detailInclude });
}

function addDocument(applicationId, data) {
  return prisma.rJApplicationDocument.create({
    data: { ...data, applicationId: BigInt(applicationId) },
  });
}

function updateStatus(id, data) {
  return prisma.rJApplication.update({
    where: { id: BigInt(id) },
    data,
    include: detailInclude,
  });
}

function updatePriority(id, priority) {
  return prisma.rJApplication.update({
    where: { id: BigInt(id) },
    data: { priority },
    include: detailInclude,
  });
}

// Called by the async AI/OCR write-path (webhook or worker), same
// never-touches-status-or-reviewedBy pattern as verifications module.
function applyAiResults(id, data) {
  return prisma.rJApplication.update({
    where: { id: BigInt(id) },
    data,
    include: detailInclude,
  });
}

module.exports = {
  listApplications,
  getStats,
  findById,
  findByAppCode,
  findPendingByUserId,
  createApplication,
  addDocument,
  updateStatus,
  updatePriority,
  applyAiResults,
};