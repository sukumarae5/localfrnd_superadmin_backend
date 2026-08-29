const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./bankaccount.repository");

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  return `****${accountNumber.slice(-4)}`;
}

function serializeListItem(a) {
  return {
    id: a.publicId,
    bankName: a.bankName,
    accountType: a.accountType,
    maskedAccountNumber: maskAccountNumber(a.accountNumber),
    upiId: a.upiId,
    status: a.status,
    isDuplicateFlagged: a.isDuplicateFlagged,
    duplicateRiskLevel: a.duplicateRiskLevel,
    updatedAt: a.updatedAt,
    rj: {
      id: a.rj.id.toString(),
      displayCode: a.rj.displayCode,
      fullName: a.rj.user.fullName,
      avatarUrl: a.rj.user.avatarUrl,
    },
  };
}

function serializeDetail(a, duplicates = []) {
  return {
    id: a.publicId,
    rj: {
      id: a.rj.id.toString(),
      displayCode: a.rj.displayCode,
      fullName: a.rj.user.fullName,
      avatarUrl: a.rj.user.avatarUrl,
    },
    submittedDetails: {
      bankName: a.bankName,
      accountType: a.accountType,
      ifscCode: a.ifscCode,
      upiId: a.upiId,
      accountHolderName: a.accountHolderName,
    },
    status: a.status,
    isPrimary: a.isPrimary,
    verificationChecklist: {
      aadhaarVerified: a.aadhaarVerified,
      panMatchScore: a.panMatchScore,
      pennyDropStatus: a.pennyDropStatus,
    },
    adminNotes: a.adminNotes,
    rejectionReason: a.rejectionReason,
    verifiedBy: a.verifiedBy?.fullName || null,
    verifiedAt: a.verifiedAt,
    duplicateRisk: {
      isFlagged: a.isDuplicateFlagged,
      level: a.duplicateRiskLevel,
      matches: duplicates.map((d) => ({ id: d.publicId, rjDisplayCode: d.rj.displayCode })),
    },
    verificationLog: (a.logs || []).map((log) => ({
      action: log.action,
      note: log.note,
      admin: log.performedBy?.fullName || "System",
      at: log.createdAt,
    })),
  };
}

function mapKnownErrors(err) {
  const map = {
    BANK_ACCOUNT_NOT_FOUND: [HTTP_STATUS.NOT_FOUND, "Bank account not found"],
  };
  if (map[err.message]) throw new ApiError(...map[err.message]);
  throw err;
}

async function listBankAccounts(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [{ rows, total }, stats] = await Promise.all([
    repo.listBankAccounts({
      page,
      limit,
      status: query.status,
      search: query.search,
      accountOrUpi: query.accountOrUpi,
      bankName: query.bankName,
      duplicatesOnly: query.duplicatesOnly,
    }),
    repo.getStats(),
  ]);

  return {
    bankAccounts: rows.map(serializeListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getDetail(publicId) {
  const account = await repo.findByPublicId(publicId);
  if (!account) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Bank account not found");

  const duplicates = await repo.findDuplicatesByAccountNumber(account.accountNumber, account.id);
  return serializeDetail(account, duplicates);
}

async function approve(id, adminId, body) {
  try {
    const account = await repo.approve(id, adminId, body);
    return serializeDetail(account);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function reject(id, adminId, body) {
  try {
    const account = await repo.reject(id, adminId, body);
    return serializeDetail(account);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function addNote(id, adminId, note) {
  try {
    const account = await repo.addNote(id, adminId, note);
    return serializeDetail(account);
  } catch (err) {
    mapKnownErrors(err);
  }
}

async function retryPennyDrop(id, adminId) {
  try {
    const account = await repo.retryPennyDrop(id, adminId);
    return serializeDetail(account);
  } catch (err) {
    mapKnownErrors(err);
  }
}

module.exports = { listBankAccounts, getDetail, approve, reject, addNote, retryPennyDrop };