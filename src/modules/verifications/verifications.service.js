const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./verifications.repository");
const usersRepo = require("../users/users.repository");
const crypto = require("crypto");
const { riskLevelFromScore } = require("./verifications.constants");

function serializeListItem(r) {
  return {
    id: r.id.toString(),
    requestCode: r.requestCode,
    user: {
      id: r.user.id.toString(),
      fullName: r.user.fullName,
      displayCode: r.user.displayCode,
      avatarUrl: r.user.avatarUrl,
    },
    docType: r.docType,
    docNumber: r.docNumber,
    submittedAt: r.submittedAt,
    status: r.status,
    riskScore: r.riskScore,
    riskLevel: r.riskLevel,
  };
}

function serializeDetail(r) {
  return {
    id: r.id.toString(),
    requestCode: r.requestCode,
    status: r.status,
    flagged: r.flagged,
    riskScore: r.riskScore,
    riskLevel: r.riskLevel,
    user: {
      id: r.user.id.toString(),
      fullName: r.user.fullName,
      displayCode: r.user.displayCode,
      avatarUrl: r.user.avatarUrl,
      city: r.user.city,
      country: r.user.country,
    },
    document: {
      docType: r.docType,
      docNumber: r.docNumber,
      docExpiry: r.docExpiry,
      nationality: r.nationality,
    },
    evidence: {
      selfieUrl: r.selfieUrl,
      selfieQuality: r.selfieQuality,
      idFrontUrl: r.idFrontUrl,
      idFrontReadable: r.idFrontReadable,
      idBackUrl: r.idBackUrl,
      idBackSharp: r.idBackSharp,
    },
    faceMatch: { score: r.faceMatchScore },
    ocr: {
      name: r.ocrName,
      address: r.ocrAddress,
      nameMatched: r.nameMatched,
      addressMatched: r.addressMatched,
    },
    checklist: {
      idAuthenticity: r.idAuthenticity,
      faceLiveness: r.faceLiveness,
      sanctionListOk: r.sanctionListOk,
    },
    reviewedAt: r.reviewedAt,
    reviewedByName: r.reviewedBy?.fullName || null,
    rejectionReason: r.rejectionReason,
    submittedAt: r.submittedAt,
  };
}

function generateRequestCode() {
  return `KYC-INV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function listRequests(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 100);

  const [{ requests, total }, stats] = await Promise.all([
    repo.listRequests({
      page,
      limit,
      status: query.status,
      docType: query.docType,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    }),
    repo.getStats(),
  ]);

  return {
    requests: requests.map(serializeListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getByRequestCode(requestCode) {
  const r = await repo.findByRequestCode(requestCode);
  if (!r)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Verification request not found");
  return serializeDetail(r);
}

// Approve/Reject a request. On decision, also syncs the summary
// `verificationStatus` field on User so Image 1's badge stays consistent.
async function decide(id, { status, reason }, reviewedById) {
  const existing = await repo.findById(id);
  if (!existing)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Verification request not found");
  if (existing.status !== "pending_review") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Request is already ${existing.status}`,
    );
  }
  if (status === "rejected" && !reason) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "A reason is required to reject a request",
    );
  }

  const updated = await repo.updateDecision(id, {
    status,
    rejectionReason: status === "rejected" ? reason : null,
    reviewedAt: new Date(),
    reviewedById: BigInt(reviewedById),
  });

  await usersRepo.updateVerificationStatus(
    existing.userId,
    status === "approved" ? "verified" : "unverified",
    reviewedById,
  );

  return serializeDetail(await repo.findById(updated.id));
}

async function flagUser(id, flagged) {
  const existing = await repo.findById(id);
  if (!existing)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Verification request not found");
  await repo.setFlag(id, flagged);
  return { id: id.toString(), flagged };
}

async function submitVerification(
  userId,
  { docType, docNumber, docExpiry, nationality },
  files,
) {
  if (!files.selfieUrl || !files.idFrontUrl) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Selfie and ID front image are required",
    );
  }

  const created = await repo.createRequest({
    requestCode: generateRequestCode(),
    userId: BigInt(userId),
    docType,
    docNumber,
    docExpiry: docExpiry ? new Date(docExpiry) : null,
    nationality: nationality || null,
    selfieUrl: files.selfieUrl,
    idFrontUrl: files.idFrontUrl,
    idBackUrl: files.idBackUrl || null,
    status: "pending_review",
  });

  // Fire-and-forget: kick off async AI/OCR processing. Doesn't block the
  // response — the admin sees "Pending Review" immediately (matches Image 2),
  // and the fields below get filled in whenever the provider calls back.
  await queueAiProcessing(created.id, created.requestCode);

  return {
    id: created.id.toString(),
    requestCode: created.requestCode,
    status: created.status,
  };
}

async function queueAiProcessing(id, requestCode) {
  // Example, if using an HTTP-based KYC provider:
  // await axios.post(process.env.KYC_PROVIDER_URL, {
  //   referenceId: requestCode,
  //   callbackUrl: `${process.env.API_BASE_URL}/api/verifications/${requestCode}/ai-results`,
  // });
  return true;
}

// --- async AI/OCR write-path --------------------------------------------
// Called by a webhook (provider calls back) or a worker consuming a queue.
// Only ever writes analysis fields — never status, never reviewedBy.
async function applyAiResults(requestCode, results) {
  const existing = await repo.findByRequestCode(requestCode);
  if (!existing)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Verification request not found");

  const riskScore = clampScore(results.riskScore);
  const riskLevel = riskLevelFromScore(riskScore);

  const updated = await repo.updateAiResults(existing.id, {
    faceMatchScore: clampScore(results.faceMatchScore),
    selfieQuality: results.selfieQuality ?? existing.selfieQuality,
    idFrontReadable: toBoolOrExisting(
      results.idFrontReadable,
      existing.idFrontReadable,
    ),
    idBackSharp: toBoolOrExisting(results.idBackSharp, existing.idBackSharp),
    ocrName: results.ocrName ?? existing.ocrName,
    ocrAddress: results.ocrAddress ?? existing.ocrAddress,
    nameMatched: results.nameMatched ?? existing.nameMatched,
    addressMatched: results.addressMatched ?? existing.addressMatched,
    idAuthenticity: results.idAuthenticity ?? existing.idAuthenticity,
    faceLiveness: results.faceLiveness ?? existing.faceLiveness,
    sanctionListOk: results.sanctionListOk ?? existing.sanctionListOk,
    riskScore,
    riskLevel,
  });

  return serializeDetail(await repo.findById(updated.id));
}

function clampScore(n) {
  if (n === undefined || n === null) return null;
  return Math.max(0, Math.min(100, Number(n)));
}

function toBoolOrExisting(val, existing) {
  return typeof val === "boolean" ? val : existing;
}

module.exports = {
  listRequests,
  getByRequestCode,
  decide,
  flagUser,
  submitVerification,
  applyAiResults,
};
