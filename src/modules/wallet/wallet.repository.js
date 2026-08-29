const { prisma } = require("../../config/database");

function buildWalletWhere({ search, minBalance, paymentMethod }) {
  const where = { deletedAt: null };
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { displayCode: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search } },
    ];
  }
  if (minBalance !== undefined) where.wallet = { balance: { gte: minBalance } };
  if (paymentMethod) {
    where.walletTransactions = { some: { paymentMethod } };
  }
  return where;
}

async function listWallets({ page, limit, search, minBalance, paymentMethod }) {
  const where = buildWalletWhere({ search, minBalance, paymentMethod });
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        wallet: true,
        walletTransactions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [balanceAgg, coinsAgg, rechargeAgg, todayRechargeAgg, refundAgg, bonusAgg, pendingRefundAgg, pendingRefundCount] =
    await prisma.$transaction([
      prisma.userWallet.aggregate({ _sum: { balance: true }, _avg: { balance: true } }),
      prisma.userWallet.aggregate({ _sum: { coins: true } }),
      prisma.walletTransaction.aggregate({ where: { type: "recharge", status: "completed" }, _sum: { amount: true } }),
      prisma.walletTransaction.aggregate({
        where: { type: "recharge", status: "completed", createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({ where: { type: "refund", status: "completed" }, _sum: { amount: true } }),
      prisma.walletTransaction.aggregate({ where: { type: "bonus" }, _sum: { coins: true } }),
      prisma.walletTransaction.aggregate({ where: { type: "refund", status: "pending" }, _sum: { amount: true } }),
      prisma.walletTransaction.count({ where: { type: "refund", status: "pending" } }),
    ]);

  return {
    totalWalletBalance: balanceAgg._sum.balance || 0,
    totalCoinsIssued: (coinsAgg._sum.coins || 0n).toString(),
    totalRechargeAmount: rechargeAgg._sum.amount || 0,
    todaysRecharge: todayRechargeAgg._sum.amount || 0,
    totalRefunds: refundAgg._sum.amount || 0,
    bonusCoinsIssued: (bonusAgg._sum.coins || 0n).toString(),
    pendingRefunds: pendingRefundAgg._sum.amount || 0,
    pendingRefundCount,
    avgWalletBalance: balanceAgg._avg.balance || 0,
  };
}

function findWalletByUserId(userId) {
  return prisma.userWallet.findUnique({
    where: { userId: BigInt(userId) },
    include: { user: { select: { fullName: true, displayCode: true, avatarUrl: true, status: true, createdAt: true } } },
  });
}

function listTransactions({ userId, page, limit }) {
  const where = { userId: BigInt(userId) };
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.walletTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.walletTransaction.count({ where }),
  ]);
}

// All wallet mutations happen inside a transaction so the balance and the
// ledger row are always written together — never one without the other.
async function applyTransaction({ userId, type, amount, coins, paymentMethod, description, referenceId, initiatedById }) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.userWallet.findUnique({
  where: {
    userId: BigInt(userId),
  },
});

if (!wallet) {
  throw new Error(
    "WALLET_NOT_FOUND"
  );
}

if (wallet.isFrozen) {
  throw new Error(
    "WALLET_FROZEN"
  );
}
    const delta = type === "debit" ? -amount : amount;
    const coinDelta = type === "debit" ? -(coins || 0) : coins || 0;
    const newBalance = Number(wallet.balance) + delta;
    const newCoins = wallet.coins + BigInt(coinDelta);

    if (newBalance < 0) throw new Error("INSUFFICIENT_BALANCE");

    const updatedWallet = await tx.userWallet.update({
      where: { userId: BigInt(userId) },
      data: { balance: newBalance, coins: newCoins },
    });

    const txn = await tx.walletTransaction.create({
      data: {
        userId: BigInt(userId),
        type,
        status: "completed",
        amount,
        coins: coins || 0,
        balanceAfter: updatedWallet.balance,
        paymentMethod: paymentMethod || null,
        description: description || null,
        referenceId: referenceId || null,
        initiatedById: initiatedById ? BigInt(initiatedById) : null,
      },
    });

    return { wallet: updatedWallet, txn };
  });
}

function setFrozen(userId, isFrozen, frozenById) {
  return prisma.userWallet.update({
    where: { userId: BigInt(userId) },
    data: {
      isFrozen,
      frozenAt: isFrozen ? new Date() : null,
      frozenById: isFrozen && frozenById ? BigInt(frozenById) : null,
    },
  });
}

function findUserById(userId) {
  return prisma.user.findUnique({
    where: {
      id: BigInt(userId),
    },

    select: {
      id: true,
      fullName: true,
      displayCode: true,
      status: true,
    },
  });
}


function createWallet(userId) {
  return prisma.userWallet.create({
    data: {
      userId: BigInt(userId),

      balance: 0,

      coins: 0,

      isFrozen: false,
    },
  });
}

async function createMyWallet(req, res, next) {
  try {
    const userId = req.user.id;

    const wallet = await service.createMyWallet(
      userId
    );

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          wallet,
          "Wallet created successfully"
        )
      );

  } catch (err) {
    next(err);
  }
}

module.exports = { listWallets, getStats, findWalletByUserId, listTransactions, applyTransaction, setFrozen, findUserById, createWallet, createMyWallet };
