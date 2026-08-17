// src/modules/rj/application/application.service.js
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const { generateAppCode, priorityFromScore } = require("./application.constants");
const repo = require("./application.repository");
const usersRepo = require("../../users/users.repository");
const rjService = require("../profile/rj.service");

function serializeListItem(a) {
  return {
    id: a.id.toString(),
    appCode: a.appCode,
    user: {
      id: a.user.id.toString(),
      fullName: a.user.fullName,
      displayCode: a.user.displayCode,
      avatarUrl: a.user.avatarUrl,
      mobileNumber: a.user.mobileNumber,
    },
    category: a.category?.name || null,
    experienceYears: a.experienceYears,
    status: a.status,
    priority: a.priority,
    kycStatus: a.aadhaarMatch && a.panMatch ? "KYC Verified" : "KYC Submitted",
    submittedAt: a.submittedAt,
  };
}

function serializeDetail(a) {
  return {
    id: a.id.toString(),
    appCode: a.appCode,
    status: a.status,
    priority: a.priority,
    user: {
      id: a.user.id.toString(),
      fullName: a.user.fullName,
      displayCode: a.user.displayCode,
      avatarUrl: a.user.avatarUrl,
      mobileCountryCode: a.user.mobileCountryCode,
      mobileNumber: a.user.mobileNumber,
    },
    category: a.category?.name || null,
    experienceYears: a.experienceYears,
    documents: a.documents.map((d) => ({
      id: d.id.toString(),
      docType: d.docType,
      docUrl: d.docUrl,
      verificationMethod: d.verificationMethod,
      aiConfidenceScore: d.aiConfidenceScore,
      verifiedAt: d.verifiedAt,
    })),
    checklist: {
      aadhaarMatch: a.aadhaarMatch,
      panMatch: a.panMatch,
      faceIdMatchScore: a.faceIdMatchScore,
    },
    aiScreening: {
      aiSuitabilityScore: a.aiSuitabilityScore,
      communicationScore: a.communicationScore,
      riskScore: a.riskScore,
    },
    reviewedAt: a.reviewedAt,
    reviewedByName: a.reviewedBy?.fullName || null,
    rejectionReason: a.rejectionReason,
    submittedAt: a.submittedAt,
  };
}

async function listApplications(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 100);

  const [{ applications, total }, stats] = await Promise.all([
    repo.listApplications({
      page,
      limit,
      search: query.search,
      status: query.status,
      priority: query.priority,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
      kycStatus: query.kycStatus,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      sortBy: query.sortBy || "submittedAt",
      sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    }),
    repo.getStats(),
  ]);

  return {
    applications: applications.map(serializeListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getByAppCode(appCode) {
  const a = await repo.findByAppCode(appCode);
  if (!a) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");
  return serializeDetail(a);
}

// The applicant is an existing (typically female) User applying to become
// an RJ — we don't re-collect identity fields, only application-specific data.
async function submitApplication({ userId, categoryId, experienceYears }) {
  const user = await usersRepo.findById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const alreadyPending = await repo.findPendingByUserId(userId);
  if (alreadyPending) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "This user already has an application in progress");
  }

  const created = await repo.createApplication({
    userId: BigInt(userId),
    appCode: generateAppCode(),
    categoryId: categoryId || null,
    experienceYears: experienceYears || 0,
    status: "pending",
    priority: "medium",
  });

  return serializeDetail(created);
}

async function addDocument(applicationId, { docType, docUrl }) {
  const existing = await repo.findById(applicationId);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");

  await repo.addDocument(applicationId, {
    docType,
    docUrl,
    verificationMethod: "ai",
  });

  return getByAppCode(existing.appCode);
}

// Async AI/OCR write-path — never touches status/reviewedBy, mirrors
// verifications.service.js applyAiResults exactly.
async function applyAiResults(appCode, results) {
  const existing = await repo.findByAppCode(appCode);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");

  const suitabilityScore = clampScore(results.aiSuitabilityScore);

  const updated = await repo.applyAiResults(existing.id, {
    aadhaarMatch: typeof results.aadhaarMatch === "boolean" ? results.aadhaarMatch : existing.aadhaarMatch,
    panMatch: typeof results.panMatch === "boolean" ? results.panMatch : existing.panMatch,
    faceIdMatchScore: clampScore(results.faceIdMatchScore) ?? existing.faceIdMatchScore,
    aiSuitabilityScore: suitabilityScore ?? existing.aiSuitabilityScore,
    communicationScore: clampScore(results.communicationScore) ?? existing.communicationScore,
    riskScore: clampScore(results.riskScore) ?? existing.riskScore,
    priority: suitabilityScore !== null ? priorityFromScore(suitabilityScore) : existing.priority,
  });

  return serializeDetail(await repo.findById(updated.id));
}

function clampScore(n) {
  if (n === undefined || n === null) return null;
  return Math.max(0, Math.min(100, Number(n)));
}

// Approve / Reject / Request Docs / Interview — the four action buttons on
// the Review Application panel (Image 2).
async function decide(id, { status, reason }, reviewedById) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");

  if (["approved", "rejected"].includes(existing.status)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Application is already ${existing.status}`);
  }

  if (status === "rejected" && !reason) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "A reason is required to reject an application");
  }

  const updated = await repo.updateStatus(id, {
    status,
    rejectionReason: status === "rejected" ? reason : null,
    reviewedAt: new Date(),
    reviewedById: BigInt(reviewedById),
  });

  // Approval is the pivot: it creates the actual RJ profile + wallet.
  if (status === "approved") {
    await rjService.createFromApplication({
      userId: existing.userId,
      applicationId: existing.id,
      categoryId: existing.categoryId,
      experienceYears: existing.experienceYears,
      createdById: reviewedById,
    });
  }

  return serializeDetail(await repo.findById(updated.id));
}

// "Request Docs" — moves status to under_review without a full decision yet.
async function requestDocs(id, reviewedById) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");

  const updated = await repo.updateStatus(id, { status: "under_review" });
  return serializeDetail(await repo.findById(updated.id));
}

// "Interview" — moves status to interview_pending.
async function scheduleInterview(id, reviewedById) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");

  const updated = await repo.updateStatus(id, { status: "interview_pending" });
  return serializeDetail(await repo.findById(updated.id));
}

async function updatePriority(id, priority) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Application not found");

  const updated = await repo.updatePriority(id, priority);
  return serializeDetail(await repo.findById(updated.id));
}

module.exports = {
  listApplications,
  getByAppCode,
  submitApplication,
  addDocument,
  applyAiResults,
  decide,
  requestDocs,
  scheduleInterview,
  updatePriority,
};