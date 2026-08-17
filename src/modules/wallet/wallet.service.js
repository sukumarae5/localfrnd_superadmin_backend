const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./wallet.repository");

function serializeWalletListItem(user) {
  return {
    id: user.id.toString(),
    fullName: user.fullName,
    displayCode: user.displayCode,
    avatarUrl: user.avatarUrl,
    mobileNumber: user.mobileNumber,
    balance: user.wallet?.balance ?? 0,
    coins: (user.wallet?.coins ?? 0n).toString(),
    isFrozen: user.wallet?.isFrozen ?? false,
    lastTransactionAt: user.walletTransactions?.[0]?.createdAt || null,
    status: user.wallet?.isFrozen ? "Frozen" : "Active",
  };
}

function serializeTxn(t) {
  return {
    id: t.id.toString(),
    publicId: t.publicId,
    type: t.type,
    status: t.status,
    amount: t.amount,
    coins: t.coins.toString(),
    balanceAfter: t.balanceAfter,
    paymentMethod: t.paymentMethod,
    description: t.description,
    referenceId: t.referenceId,
    createdAt: t.createdAt,
  };
}

async function listWallets(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const [{ users, total }, stats] = await Promise.all([
    repo.listWallets({
      page, limit,
      search: query.search,
      minBalance: query.minBalance ? Number(query.minBalance) : undefined,
      paymentMethod: query.paymentMethod,
    }),
    repo.getStats(),
  ]);

  return {
    wallets: users.map(serializeWalletListItem),
    stats,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getWalletDetail(userId) {
  const wallet = await repo.findWalletByUserId(userId);
  if (!wallet) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this user");

  const [transactions] = await repo.listTransactions({ userId, page: 1, limit: 5 });

  return {
    userId: userId.toString(),
    fullName: wallet.user.fullName,
    displayCode: wallet.user.displayCode,
    avatarUrl: wallet.user.avatarUrl,
    status: wallet.user.status,
    joinedAt: wallet.user.createdAt,
    balance: wallet.balance,
    coins: wallet.coins.toString(),
    isFrozen: wallet.isFrozen,
    recentTransactions: transactions.map(serializeTxn),
  };
}

async function listTransactions(userId, query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const [transactions, total] = await repo.listTransactions({ userId, page, limit });

  return {
    transactions: transactions.map(serializeTxn),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function creditWallet(userId, { amount, coins, paymentMethod, description, referenceId }, adminId) {
  try {
    const { wallet, txn } = await repo.applyTransaction({
      userId, type: "credit", amount, coins, paymentMethod, description, referenceId, initiatedById: adminId,
    });
    return { balance: wallet.balance, coins: wallet.coins.toString(), transaction: serializeTxn(txn) };
  } catch (err) {
    if (err.message === "WALLET_NOT_FOUND") throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this user");
    throw err;
  }
}

async function debitWallet(userId, { amount, coins, paymentMethod, description, referenceId }, adminId) {
  try {
    const { wallet, txn } = await repo.applyTransaction({
      userId, type: "debit", amount, coins, paymentMethod, description, referenceId, initiatedById: adminId,
    });
    return { balance: wallet.balance, coins: wallet.coins.toString(), transaction: serializeTxn(txn) };
  } catch (err) {
    if (err.message === "WALLET_NOT_FOUND") throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this user");
    if (err.message === "INSUFFICIENT_BALANCE") throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Insufficient wallet balance for this debit");
    throw err;
  }
}

async function setFrozen(userId, isFrozen, adminId) {
  const wallet = await repo.findWalletByUserId(userId);
  if (!wallet) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this user");

  const updated = await repo.setFrozen(userId, isFrozen, adminId);
  return { userId: userId.toString(), isFrozen: updated.isFrozen, frozenAt: updated.frozenAt };
}

module.exports = { listWallets, getWalletDetail, listTransactions, creditWallet, debitWallet, setFrozen };