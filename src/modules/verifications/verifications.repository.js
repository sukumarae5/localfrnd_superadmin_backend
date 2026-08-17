const { prisma } = require("../../config/database");

function buildWhere({ status, docType, dateFrom, dateTo }) {
  const where = {};
  if (status) where.status = status;
  if (docType) where.docType = docType;
  if (dateFrom || dateTo) {
    where.submittedAt = {};
    if (dateFrom) where.submittedAt.gte = dateFrom;
    if (dateTo) where.submittedAt.lte = dateTo;
  }
  return where;
}

async function listRequests({
  page,
  limit,
  status,
  docType,
  dateFrom,
  dateTo,
}) {
  const where = buildWhere({ status, docType, dateFrom, dateTo });
  const skip = (page - 1) * limit;

  const [requests, total] = await prisma.$transaction([
    prisma.kycVerification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { submittedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            displayCode: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.kycVerification.count({ where }),
  ]);

  return { requests, total };
}

// Stat cards on top of the screen (Total / Pending / Approved / Rejected / Expired / Success Rate)
async function getStats() {
  const [total, pending, approved, rejected, expired] =
    await prisma.$transaction([
      prisma.kycVerification.count(),
      prisma.kycVerification.count({ where: { status: "pending_review" } }),
      prisma.kycVerification.count({ where: { status: "approved" } }),
      prisma.kycVerification.count({ where: { status: "rejected" } }),
      prisma.kycVerification.count({ where: { status: "expired" } }),
    ]);

  const decided = approved + rejected;
  const successRate = decided > 0 ? (approved / decided) * 100 : 0;

  return { total, pending, approved, rejected, expired, successRate };
}

function findByRequestCode(requestCode) {
  return prisma.kycVerification.findUnique({
    where: { requestCode },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          city: true,
          country: true,
          avatarUrl: true,
          displayCode: true,
        },
      },
      reviewedBy: { select: { fullName: true } },
    },
  });
}

function findById(id) {
  return prisma.kycVerification.findUnique({
    where: { id: BigInt(id) },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          city: true,
          country: true,
          avatarUrl: true,
          displayCode: true,
        },
      },
      reviewedBy: { select: { fullName: true } },
    },
  });
}

function updateDecision(id, data) {
  return prisma.kycVerification.update({
    where: { id: BigInt(id) },
    data,
    include: { user: { select: { fullName: true, displayCode: true } } },
  });
}

function setFlag(id, flagged) {
  return prisma.kycVerification.update({
    where: { id: BigInt(id) },
    data: { flagged },
  });
}

function createRequest(data) {
  return prisma.kycVerification.create({
    data,
    include: { user: { select: { fullName: true, displayCode: true } } },
  });
}

// Called by the async AI/OCR write-path once results come back.
// Never touches status/reviewedBy — that stays a human decision via decide().
function updateAiResults(id, data) {
  return prisma.kycVerification.update({
    where: { id: BigInt(id) },
    data,
  });
}

module.exports = {
  listRequests,
  getStats,
  findByRequestCode,
  findById,
  updateDecision,
  setFlag,
  createRequest,
  updateAiResults,
};
