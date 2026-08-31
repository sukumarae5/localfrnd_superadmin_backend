const { prisma } = require("../../config/database");

function buildWhere({ userId, coinPackageId, type, status }) {
  const where = {};

  if (userId) {
    where.userId = BigInt(userId);
  }

  if (coinPackageId) {
    where.coinPackageId = Number(coinPackageId);
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  return where;
}

async function listTransactions({ page, limit, userId, coinPackageId, type, status }) {
  const where = buildWhere({ userId, coinPackageId, type, status });

  const skip = (page - 1) * limit;

  const [transactions, total] = await prisma.$transaction([
    prisma.coinTransaction.findMany({
      where,
      skip,
      take: limit,

      include: {
        user: {
          select: {
            id: true,
            publicId: true,
            fullName: true,
            mobileCountryCode: true,
            mobileNumber: true,
          },
        },

        coinPackage: {
          select: {
            id: true,
            publicId: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.coinTransaction.count({ where }),
  ]);

  return {
    transactions,
    total,
  };
}

async function findById(id) {
  return prisma.coinTransaction.findUnique({
    where: {
      id: BigInt(id),
    },
  });
}

async function findByPublicId(publicId) {
  return prisma.coinTransaction.findUnique({
    where: {
      publicId,
    },
  });
}

async function create(data) {
  return prisma.coinTransaction.create({
    data,
  });
}

async function update(id, data) {
  return prisma.coinTransaction.update({
    where: {
      id: BigInt(id),
    },
    data,
  });
}

async function findUserTransactions(userId, page, limit) {
  const skip = (page - 1) * limit;

  const where = {
    userId: BigInt(userId),
  };

  const [transactions, total] = await prisma.$transaction([
    prisma.coinTransaction.findMany({
      where,
      skip,
      take: limit,

      include: {
        coinPackage: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.coinTransaction.count({ where }),
  ]);

  return {
    transactions,
    total,
  };
}

/*
Wallet is the single source of truth for a
user's coin balance (same table Plans/Offers
already write to). CoinPackage purchases must
read/credit here, never User.coinBalance --
that field does not exist on the User model.
*/

async function getWalletByUserId(userId) {
  return prisma.userWallet.findUnique({
    where: {
      userId: BigInt(userId),
    },
  });
}

async function findSuccessfulTransactionByPaymentId(paymentId) {
  return prisma.coinTransaction.findFirst({
    where: {
      paymentId,
      status: "success",
    },
  });
}

/*
Full purchase flow for a flat coin-package
top-up: creates the CoinTransaction ledger row
(package/payment metadata), credits UserWallet
(coins + balance), and writes a WalletTransaction
row so this purchase shows up in the same wallet
history as Plan purchases. All in one transaction
so a partial purchase can never happen.
*/

async function completePurchase({
  userId,
  coinPackage,
  paymentProvider,
  paymentId,
  paymentOrderId,
  paymentMethod,
}) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.userWallet.findUnique({
      where: {
        userId: BigInt(userId),
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const coinTransaction = await tx.coinTransaction.create({
      data: {
        userId: BigInt(userId),

        coinPackageId: coinPackage.id,

        type: "purchase",
        status: "success",

        coins: coinPackage.coins,
        bonusCoins: coinPackage.bonusCoins,
        totalCoins: coinPackage.totalCoins,

        amount: coinPackage.price,
        currency: coinPackage.currency,

        paymentProvider,
        paymentId,
        paymentOrderId,
      },
    });

    const updatedWallet = await tx.userWallet.update({
      where: {
        userId: BigInt(userId),
      },

      data: {
        balance: Number(wallet.balance) + Number(coinPackage.price),
        coins: wallet.coins + BigInt(coinPackage.totalCoins),
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: BigInt(userId),

        type: "recharge",
        status: "completed",

        amount: coinPackage.price,
        coins: coinPackage.totalCoins,

        balanceAfter: updatedWallet.balance,

        paymentMethod: paymentMethod || null,

        description: `Coin package purchase — ${coinPackage.name}`,

        referenceId: coinTransaction.id.toString(),
      },
    });

    return {
      transaction: coinTransaction,
      wallet: updatedWallet,
    };
  });
}

module.exports = {
  listTransactions,
  findById,
  findByPublicId,
  create,
  update,
  findUserTransactions,
  getWalletByUserId,
  findSuccessfulTransactionByPaymentId,
  completePurchase,
};