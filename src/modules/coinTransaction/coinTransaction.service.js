const ApiError =
  require("../../utils/apiError.util");

const {
  HTTP_STATUS,
} = require("../../constants");

const { prisma } =
  require("../../config/database");

const repo =
  require("./coinTransaction.repository");

function serializeTransaction(item) {
  return {
    id: item.id.toString(),
    publicId: item.publicId,

    userId: item.userId.toString(),

    coinPackageId:
      item.coinPackageId,

    type: item.type,
    status: item.status,

    coins: item.coins,
    bonusCoins: item.bonusCoins,
    totalCoins: item.totalCoins,

    amount: item.amount
      ? Number(item.amount)
      : null,

    currency: item.currency,

    paymentProvider:
      item.paymentProvider,

    paymentId: item.paymentId,

    paymentOrderId:
      item.paymentOrderId,

    metadata: item.metadata,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    user: item.user
      ? {
          id: item.user.id.toString(),
          publicId: item.user.publicId,
          fullName: item.user.fullName,
          mobile: item.user.mobile,
        }
      : undefined,

    coinPackage: item.coinPackage
      ? item.coinPackage
      : undefined,
  };
}

async function listCoinTransactions(
  query
) {
  const page =
    Number(query.page) || 1;

  const limit = Math.min(
    Number(query.limit) || 20,
    100
  );

  const { transactions, total } =
    await repo.listTransactions({
      page,
      limit,
      userId: query.userId,
      coinPackageId:
        query.coinPackageId,
      type: query.type,
      status: query.status,
    });

  return {
    transactions:
      transactions.map(
        serializeTransaction
      ),

    pagination: {
      page,
      limit,
      total,
      totalPages:
        Math.ceil(total / limit),
    },
  };
}

async function getUserCoinBalance(
  userId
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id: BigInt(userId),
      },

      select: {
        id: true,
        coinBalance: true,
      },
    });

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "User not found"
    );
  }

  return {
    coinBalance:
      user.coinBalance,
  };
}

async function getUserTransactions(
  userId,
  query
) {
  const page =
    Number(query.page) || 1;

  const limit = Math.min(
    Number(query.limit) || 20,
    100
  );

  const {
    transactions,
    total,
  } =
    await repo.findUserTransactions(
      userId,
      page,
      limit
    );

  return {
    transactions:
      transactions.map(
        serializeTransaction
      ),

    pagination: {
      page,
      limit,
      total,
      totalPages:
        Math.ceil(total / limit),
    },
  };
}

/*
This function should ONLY be called
after payment verification.
For example, from Razorpay webhook.
*/

async function completePurchase({
  userId,
  coinPackageId,
  paymentProvider,
  paymentId,
  paymentOrderId,
}) {
  return prisma.$transaction(
    async (tx) => {
      const coinPackage =
        await tx.coinPackage.findFirst({
          where: {
            id:
              Number(
                coinPackageId
              ),

            deletedAt: null,

            status: "active",
          },
        });

      if (!coinPackage) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          "Coin package not found"
        );
      }

      /*
      Prevent duplicate payment
      processing.
      */

      if (paymentId) {
        const existing =
          await tx.coinTransaction.findFirst(
            {
              where: {
                paymentId,
                status: "success",
              },
            }
          );

        if (existing) {
          return {
            transaction: existing,
            alreadyProcessed: true,
          };
        }
      }

      const transaction =
        await tx.coinTransaction.create({
          data: {
            userId:
              BigInt(userId),

            coinPackageId:
              coinPackage.id,

            type: "purchase",

            status: "success",

            coins:
              coinPackage.coins,

            bonusCoins:
              coinPackage.bonusCoins,

            totalCoins:
              coinPackage.totalCoins,

            amount:
              coinPackage.price,

            currency:
              coinPackage.currency,

            paymentProvider,

            paymentId,

            paymentOrderId,
          },
        });

      await tx.user.update({
        where: {
          id:
            BigInt(userId),
        },

        data: {
          coinBalance: {
            increment:
              coinPackage.totalCoins,
          },
        },
      });

      return {
        transaction,
        alreadyProcessed: false,
      };
    }
  );
}

module.exports = {
  listCoinTransactions,
  getUserCoinBalance,
  getUserTransactions,
  completePurchase,
};