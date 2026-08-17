const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./withdrawal.repository");

function serializeListItem(p) {
  return {
    id: p.id.toString(),
    displayCode: p.displayCode,
    status: p.status,
    amount: p.amount,
    withdrawableBalance: p.withdrawableBalance,
    method: p.method,
    vpa: p.vpa,
    isHighPriority: p.isHighPriority,
    createdAt: p.createdAt,
    rj: {
      id: p.rj.id.toString(),
      displayCode: p.rj.displayCode,
      fullName: p.rj.user.fullName,
      avatarUrl: p.rj.user.avatarUrl,
      avgRating: p.rj.avgRating,
      category: p.rj.categories?.[0]?.category?.name || null,
      kycVerified: p.rj.verificationStatus === "verified",
    },
  };
}

function serializeDetail(p) {
  return {
    id: p.id.toString(),
    displayCode: p.displayCode,
    status: p.status,
    amount: p.amount,
    withdrawableBalance: p.withdrawableBalance,
    method: p.method,
    vpa: p.vpa,
    bankAccountMasked: p.bankAccountMasked,
    ifscCode: p.ifscCode,
    verificationPct: p.verificationPct,
    verificationChecklist: p.verificationChecklist,
    riskScore: p.riskScore,
    riskFlags: p.riskFlags,
    rejectionCode: p.rejectionCode,
    rejectionReason: p.rejectionReason,
    appealStatus: p.appealStatus,
    appealMessage: p.appealMessage,
    createdAt: p.createdAt,
    approvedAt: p.approvedAt,
    rejectedAt: p.rejectedAt,
    processedBy: p.processedBy?.fullName || null,
    rj: {
      id: p.rj.id.toString(),
      displayCode: p.rj.displayCode,
      fullName: p.rj.user.fullName,
      avatarUrl: p.rj.user.avatarUrl,
      bio: p.rj.user.bio,
      avgRating: p.rj.avgRating,
      totalCallsCount: p.rj.totalCallsCount,
    },
  };
}

// Every repository "business" error is a plain Error thrown with a known
// message code — translate those into the right ApiError/status here so
// the repository stays free of HTTP concerns.
function mapKnownErrors(err) {
  const map = {
    WITHDRAWAL_NOT_FOUND: [HTTP_STATUS.NOT_FOUND, "Withdrawal request not found"],
    INVALID_STATUS_TRANSITION: [HTTP_STATUS.BAD_REQUEST, "This request has already been processed"],
    INSUFFICIENT_RJ_BALANCE: [HTTP_STATUS.BAD_REQUEST, "Wallet balance is insufficient for this payout"],
    NO_PENDING_APPEAL: [HTTP_STATUS.BAD_REQUEST, "There is no pending appeal on this request"],
    RJ_WALLET_NOT_FOUND: [HTTP_STATUS.NOT_FOUND, "RJ wallet not found"],
    PENDING_REQUEST_EXISTS: [HTTP_STATUS.CONFLICT, "You already have a pending withdrawal request — wait for it to be processed before raising another"],
    DISPLAY_CODE_GENERATION_FAILED: [HTTP_STATUS.INTERNAL_SERVER_ERROR, "Could not generate a withdrawal reference — please try again"],
    ONLY_REJECTED_CAN_APPEAL: [HTTP_STATUS.BAD_REQUEST, "Only a rejected withdrawal can be appealed"],
    APPEAL_ALREADY_PENDING: [HTTP_STATUS.CONFLICT, "An appeal is already pending review on this request"],
  };
  if (map[err.message]) throw new ApiError(...map[err.message]);
  throw err;
}

async function listWithdrawals(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const status = query.status || "pending";

  const [{ rows, total }, stats] = await Promise.all([
    repo.listWithdrawals({
      page,
      limit,
      status,
      search: query.search,
      category: query.category,
      amountMin: query.amountMin ? Number(query.amountMin) : undefined,
      amountMax: query.amountMax ? Number(query.amountMax) : undefined,
      kycStatus: query.kycStatus,
      paymentMethod: query.paymentMethod,
    }),
    status === "approved"
      ? repo.getApprovedStats()
      : status === "rejected"
      ? repo.getRejectedStats()
      : repo.getPendingStats(),
  ]);

  return {
    withdrawals: rows.map(serializeListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getDetail(idOrCode) {
  const payout = await repo.findByPublicOrDisplayId(idOrCode);
  if (!payout) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Withdrawal request not found");
  return serializeDetail(payout);
}

async function approve(id, adminId) {
  try {
    const payout = await repo.approve(id, adminId);
    return serializeDetail(payout);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function reject(id, body, adminId) {
  try {
    const payout = await repo.reject(id, body, adminId);
    return serializeDetail(payout);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function bulkApprove(ids, adminId) {
  return repo.bulkApprove(ids, adminId);
}

async function bulkReject(ids, body, adminId) {
  return repo.bulkReject(ids, body, adminId);
}

async function dismissAppeal(id, adminId) {
  try {
    const payout = await repo.dismissAppeal(id, adminId);
    return serializeDetail(payout);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function approveOverrule(id, adminId) {
  try {
    const payout = await repo.approveOverrule(id, adminId);
    return serializeDetail(payout);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function createWithdrawalRequest(rjId, body) {
  try {
    const payout = await repo.createWithdrawalRequest(rjId, body);
    return serializeDetail(payout);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function listMyWithdrawals(rjId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [rows, total] = await repo.listForRj(rjId, { page, limit, status: query.status });

  return {
    withdrawals: rows.map((p) => ({
      id: p.id.toString(),
      displayCode: p.displayCode,
      status: p.status,
      amount: p.amount,
      method: p.method,
      rejectionReason: p.rejectionReason,
      appealStatus: p.appealStatus,
      createdAt: p.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getMyWithdrawalDetail(rjId, idOrCode) {
  const payout = await repo.findForRj(rjId, idOrCode);
  if (!payout) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Withdrawal request not found");
  return serializeDetail(payout);
}

async function raiseAppeal(rjId, idOrCode, appealMessage) {
  try {
    const payout = await repo.raiseAppeal(rjId, idOrCode, appealMessage);
    return serializeDetail(payout);
  } catch (err) {
    mapKnownErrors(err);
  }
}

module.exports = {
  listWithdrawals,
  getDetail,
  approve,
  reject,
  bulkApprove,
  bulkReject,
  dismissAppeal,
  approveOverrule,
  createWithdrawalRequest,
  listMyWithdrawals,
  getMyWithdrawalDetail,
  raiseAppeal,
};