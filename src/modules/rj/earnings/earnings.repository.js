// src/modules/rj/earnings/earnings.repository.js
const { prisma } = require("../../../config/database");

// These three are what actually add to an RJ's earnings ledger.
// "commission" and "withdrawal" are handled separately — see the note in
// applyWalletTransaction below.
const EARNING_CREDIT_TYPES = ["call_earning", "bonus", "referral"];

function buildWhere({ search, tier, status }) {
  const where = { deletedAt: null };
  if (tier) where.tier = tier;
  // Account status (active/inactive/suspended/blocked) lives on User, not
  // on RJ.status (which is real-time presence: online/offline/busy/on_call).
  if (status) where.user = { status };
  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function listRJs({ page, limit, search, tier, status }) {
  const where = buildWhere({ search, tier, status });
  const skip = (page - 1) * limit;

  const [rjs, total] = await prisma.$transaction([
    prisma.rJ.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        categories: { include: { category: true } },
        wallet: true,
      },
    }),
    prisma.rJ.count({ where }),
  ]);

  return { rjs, total };
}

// Sums credit-type ledger entries per RJ for a batch of ids, optionally since a date.
async function sumEarningsByRJ(rjIds, since) {
  if (!rjIds.length) return {};

  const grouped = await prisma.rJWalletTransaction.groupBy({
    by: ["rjId"],
    where: {
      rjId: { in: rjIds.map((id) => BigInt(id)) },
      type: { in: EARNING_CREDIT_TYPES },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _sum: { amount: true },
  });

  const map = {};
  grouped.forEach((g) => { map[g.rjId.toString()] = g._sum.amount || 0; });
  return map;
}

async function getStatsCards() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    lifetimeAgg,
    todayAgg,
    weekAgg,
    monthAgg,
    pendingPayoutAgg,
    completedPayoutAgg,
    bonusAgg,
    activeRJCount,
  ] = await prisma.$transaction([
    prisma.rJWalletTransaction.aggregate({ where: { type: { in: EARNING_CREDIT_TYPES } }, _sum: { amount: true } }),
    prisma.rJWalletTransaction.aggregate({ where: { type: { in: EARNING_CREDIT_TYPES }, createdAt: { gte: startOfToday } }, _sum: { amount: true } }),
    prisma.rJWalletTransaction.aggregate({ where: { type: { in: EARNING_CREDIT_TYPES }, createdAt: { gte: startOfWeek } }, _sum: { amount: true } }),
    prisma.rJWalletTransaction.aggregate({ where: { type: { in: EARNING_CREDIT_TYPES }, createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.rJPayout.aggregate({ where: { status: { in: ["pending", "processing"] } }, _sum: { amount: true } }),
    prisma.rJPayout.aggregate({ where: { status: "success" }, _sum: { amount: true } }),
    prisma.rJWalletTransaction.aggregate({ where: { type: "bonus" }, _sum: { amount: true } }),
    prisma.rJ.count({ where: { deletedAt: null, status: { not: "offline" } } }),
  ]);

  const totalEarnings = lifetimeAgg._sum.amount || 0;

  return {
    totalRJEarnings: totalEarnings,
    todaysEarnings: todayAgg._sum.amount || 0,
    weeklyEarnings: weekAgg._sum.amount || 0,
    monthlyEarnings: monthAgg._sum.amount || 0,
    pendingPayouts: pendingPayoutAgg._sum.amount || 0,
    completedPayouts: completedPayoutAgg._sum.amount || 0,
    bonusPaid: bonusAgg._sum.amount || 0,
    avgEarningsPerRJ: activeRJCount > 0 ? Number((totalEarnings / activeRJCount).toFixed(2)) : 0,
  };
}

function findWallet(rjId) {
  return prisma.rJWallet.findUnique({ where: { rjId: BigInt(rjId) } });
}

function findRJWithWallet(rjId) {
  return prisma.rJ.findUnique({
    where: { id: BigInt(rjId) },
    include: { user: { select: { fullName: true, avatarUrl: true } }, wallet: true },
  });
}

function listTransactions({ rjId, page, limit, type }) {
  const where = { rjId: BigInt(rjId), ...(type ? { type } : {}) };
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.rJWalletTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.rJWalletTransaction.count({ where }),
  ]);
}

// Powers "Earnings Breakdown (Today)" — grouped by ledger type as-is.
async function getTodayBreakdown(rjId) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const grouped = await prisma.rJWalletTransaction.groupBy({
    by: ["type"],
    where: { rjId: BigInt(rjId), createdAt: { gte: startOfToday } },
    _sum: { amount: true },
  });

  return grouped.reduce((acc, g) => { acc[g.type] = g._sum.amount || 0; return acc; }, {});
}

// Powers the "Daily Trend" bar chart — last N days, summed per day.
async function getDailyTrend(rjId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const txns = await prisma.rJWalletTransaction.findMany({
    where: { rjId: BigInt(rjId), type: { in: EARNING_CREDIT_TYPES }, createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  });

  const buckets = {};
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  txns.forEach((t) => {
    const key = t.createdAt.toISOString().slice(0, 10);
    if (key in buckets) buckets[key] += Number(t.amount);
  });

  return Object.entries(buckets).map(([date, amount]) => ({ date, amount }));
}

// Powers the "Source Mix" donut chart — last 30 days.
async function getSourceMix(rjId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.rJWalletTransaction.groupBy({
    by: ["type"],
    where: { rjId: BigInt(rjId), type: { in: EARNING_CREDIT_TYPES }, createdAt: { gte: since } },
    _sum: { amount: true },
  });
  return grouped.map((g) => ({ type: g.type, amount: g._sum.amount || 0 }));
}

// All wallet mutations wrapped in one transaction — balance and ledger row
// are always written together, same pattern as wallet.repository.js.
async function applyWalletTransaction({ rjId, type, amount, description, callSessionId, initiatedById }) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.rJWallet.findUnique({ where: { rjId: BigInt(rjId) } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    const isDebit = type === "withdrawal";
    const delta = isDebit ? -amount : amount;
    const newBalance = Number(wallet.balance) + delta;

    if (newBalance < 0) throw new Error("INSUFFICIENT_BALANCE");

    const updatedWallet = await tx.rJWallet.update({
      where: { rjId: BigInt(rjId) },
      data: { balance: newBalance },
    });

    const txn = await tx.rJWalletTransaction.create({
      data: {
        rjId: BigInt(rjId),
        type,
        amount,
        balanceAfter: updatedWallet.balance,
        callSessionId: callSessionId ? BigInt(callSessionId) : null,
        description: description || null,
        initiatedById: initiatedById ? BigInt(initiatedById) : null,
      },
    });

    return { wallet: updatedWallet, txn };
  });
}

function createPayout({ rjId, amount, method, processedById }) {
  return prisma.rJPayout.create({
    data: {
      rjId: BigInt(rjId),
      amount,
      method: method || null,
      status: "success", // manual admin-processed payout completes immediately
      processedById: processedById ? BigInt(processedById) : null,
      processedAt: new Date(),
    },
  });
}

function listPayouts(rjId, limit = 10) {
  return prisma.rJPayout.findMany({
    where: { rjId: BigInt(rjId) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function updateCommission(rjId, commissionRate) {
  return prisma.rJ.update({
    where: { id: BigInt(rjId) },
    data: { commissionRate },
  });
}

module.exports = {
  listRJs,
  sumEarningsByRJ,
  getStatsCards,
  findWallet,
  findRJWithWallet,
  listTransactions,
  getTodayBreakdown,
  getDailyTrend,
  getSourceMix,
  applyWalletTransaction,
  createPayout,
  listPayouts,
  updateCommission,
};