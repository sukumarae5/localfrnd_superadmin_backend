// src/modules/rj/rings/rings.service.js
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const repo = require("./rings.repository");
const rjRepo = require("../profile/rj.repository");

function serializeWallet(wallet) {
  return {
    ringsBalance: wallet.ringsBalance.toString(),
    withdrawableBalance: wallet.balance,
  };
}

function serializeRingTxn(t) {
  return {
    id: t.id.toString(),
    publicId: t.publicId,
    type: t.type,
    rings: t.rings.toString(),
    ringsBalanceAfter: t.ringsBalanceAfter.toString(),
    description: t.description,
    createdAt: t.createdAt,
  };
}

function serializeConversion(c) {
  return {
    id: c.id.toString(),
    displayCode: c.displayCode,
    ringsConverted: c.ringsConverted.toString(),
    conversionRateApplied: c.conversionRateApplied,
    amountCredited: c.amountCredited,
    createdAt: c.createdAt,
  };
}

function serializeSetting(s) {
  return {
    conversionRate: s.conversionRate,
    minConvertibleRings: s.minConvertibleRings.toString(),
    updatedAt: s.updatedAt,
  };
}

// GET /api/rj/rings/me — her current rings balance + the settings she needs
// to know (rate + threshold) so the app can show "convert 500+ rings ≈ ₹X".
async function getMyRingsSummary(rjId) {
  const [wallet, setting, recentConversions] = await Promise.all([
    repo.findWalletByRJId(rjId),
    repo.getOrCreateSetting(),
    repo.listConversions(rjId, 5),
  ]);

  if (!wallet) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this RJ");

  return {
    ...serializeWallet(wallet),
    conversionRate: setting.conversionRate,
    minConvertibleRings: setting.minConvertibleRings.toString(),
    isEligibleToConvert: wallet.ringsBalance >= setting.minConvertibleRings,
    recentConversions: recentConversions.map(serializeConversion),
  };
}

async function listMyRingHistory(rjId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { transactions, total } = await repo.listRingTransactions({ rjId, page, limit, type: query.type });

  return {
    transactions: transactions.map(serializeRingTxn),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// POST /api/rj/rings/convert — the manual "Convert to Cash" action.
async function convertMyRings(rjId, rings) {
  const rj = await rjRepo.findById(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  try {
    const { conversion, wallet } = await repo.convertRings(rjId, rings);
    return {
      conversion: serializeConversion(conversion),
      wallet: serializeWallet(wallet),
    };
  } catch (err) {
    if (err.message === "RJ_WALLET_NOT_FOUND") {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this RJ");
    }
    if (err.message === "INSUFFICIENT_RINGS_BALANCE") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "You don't have enough rings to convert that amount");
    }
    if (err.message.startsWith("MIN_RINGS_REQUIRED:")) {
      const min = err.message.split(":")[1];
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `You need at least ${min} rings to convert`);
    }
    throw err;
  }
}

// Admin — GET/PUT the singleton rate + threshold settings.
async function getSettings() {
  return serializeSetting(await repo.getOrCreateSetting());
}

async function updateSettings({ conversionRate, minConvertibleRings }, updatedById) {
  const updated = await repo.updateSetting({ conversionRate, minConvertibleRings, updatedById });
  return serializeSetting(updated);
}

module.exports = {
  getMyRingsSummary,
  listMyRingHistory,
  convertMyRings,
  getSettings,
  updateSettings,
};