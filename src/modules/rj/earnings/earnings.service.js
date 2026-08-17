// src/modules/rj/earnings/earnings.service.js
const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const repo = require("./earnings.repository");
const rjRepo = require("../profile/rj.repository");

function serializeTxn(t) {
  return {
    id: t.id.toString(),
    publicId: t.publicId,
    type: t.type,
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    description: t.description,
    createdAt: t.createdAt,
  };
}

function serializePayout(p) {
  return {
    id: p.id.toString(),
    amount: p.amount,
    status: p.status,
    method: p.method,
    processedAt: p.processedAt,
    createdAt: p.createdAt,
  };
}

async function listEarnings(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 100);

  const [{ rjs, total }, stats] = await Promise.all([
    repo.listRJs({ page, limit, search: query.search, tier: query.tier, status: query.status }),
    repo.getStatsCards(),
  ]);

  const rjIds = rjs.map((r) => r.id.toString());
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const [todayMap, weekMap, monthMap, lifetimeMap] = await Promise.all([
    repo.sumEarningsByRJ(rjIds, startOfToday),
    repo.sumEarningsByRJ(rjIds, startOfWeek),
    repo.sumEarningsByRJ(rjIds, startOfMonth),
    repo.sumEarningsByRJ(rjIds, undefined),
  ]);

  const earnings = rjs.map((rj) => {
    const id = rj.id.toString();
    return {
      id,
      displayCode: rj.displayCode,
      fullName: rj.user.fullName,
      avatarUrl: rj.user.avatarUrl,
      tier: rj.tier,
      categories: rj.categories?.map((c) => c.category.name) || undefined,
      today: todayMap[id] || 0,
      weekly: weekMap[id] || 0,
      monthly: monthMap[id] || 0,
      lifetime: lifetimeMap[id] || 0,
      commissionRate: rj.commissionRate,
      walletBalance: rj.wallet?.balance ?? 0,
    };
  });

  return {
    earnings,
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getEarningsDetail(rjId) {
  const rj = await repo.findRJWithWallet(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const [breakdown, dailyTrend, sourceMix, payouts] = await Promise.all([
    repo.getTodayBreakdown(rjId),
    repo.getDailyTrend(rjId, 7),
    repo.getSourceMix(rjId),
    repo.listPayouts(rjId, 10),
  ]);

  const netEarningsToday = Object.values(breakdown).reduce((sum, v) => sum + Number(v), 0);

  return {
    rj: {
      id: rj.id.toString(),
      displayCode: rj.displayCode,
      fullName: rj.user.fullName,
      avatarUrl: rj.user.avatarUrl,
      tier: rj.tier,
      commissionRate: rj.commissionRate,
      walletBalance: rj.wallet?.balance ?? 0,
    },
    earningsBreakdownToday: { ...breakdown, netEarnings: netEarningsToday },
    dailyTrend,
    sourceMix,
    payoutHistory: payouts.map(serializePayout),
  };
}

async function listTransactions(rjId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const [transactions, total] = await repo.listTransactions({ rjId, page, limit, type: query.type });

  return {
    transactions: transactions.map(serializeTxn),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function processPayout(rjId, { amount, method }, adminId) {
  const wallet = await repo.findWallet(rjId);
  if (!wallet) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this RJ");
  if (Number(wallet.balance) < amount) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payout amount exceeds available wallet balance");
  }

  try {
    const { wallet: updatedWallet, txn } = await repo.applyWalletTransaction({
      rjId, type: "withdrawal", amount, description: "Payout processed by admin", initiatedById: adminId,
    });
    const payout = await repo.createPayout({ rjId, amount, method, processedById: adminId });

    return { balance: updatedWallet.balance, transaction: serializeTxn(txn), payout: serializePayout(payout) };
  } catch (err) {
    if (err.message === "WALLET_NOT_FOUND") throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this RJ");
    if (err.message === "INSUFFICIENT_BALANCE") throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Insufficient wallet balance for this payout");
    throw err;
  }
}

async function addBonus(rjId, { amount, description }, adminId) {
  try {
    const { wallet, txn } = await repo.applyWalletTransaction({
      rjId, type: "bonus", amount, description: description || "Bonus credited by admin", initiatedById: adminId,
    });
    return { balance: wallet.balance, transaction: serializeTxn(txn) };
  } catch (err) {
    if (err.message === "WALLET_NOT_FOUND") throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this RJ");
    throw err;
  }
}

async function editCommission(rjId, commissionRate, adminId) {
  const rj = await rjRepo.findById(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const previousRate = rj.commissionRate;
  await repo.updateCommission(rjId, commissionRate);
  await rjRepo.createNote({
    rjId,
    adminId,
    note: `Commission rate changed from ${previousRate}% to ${commissionRate}%`,
  });

  return { rjId: rjId.toString(), previousRate, commissionRate };
}

// "Download Statement" — returns the underlying data; wire this into your
// PDF/CSV export util (or the pdf skill) for an actual file download.
async function getStatement(rjId, { dateFrom, dateTo }) {
  const rj = await repo.findRJWithWallet(rjId);
  if (!rj || rj.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "RJ not found");

  const { transactions } = await listTransactions(rjId, { page: 1, limit: 1000 });
  const filtered = transactions.filter((t) => {
    if (dateFrom && new Date(t.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  return {
    rj: { displayCode: rj.displayCode, fullName: rj.user.fullName },
    period: { dateFrom: dateFrom || null, dateTo: dateTo || null },
    transactions: filtered,
  };
}

module.exports = {
  listEarnings,
  getEarningsDetail,
  listTransactions,
  processPayout,
  addBonus,
  editCommission,
  getStatement,
};