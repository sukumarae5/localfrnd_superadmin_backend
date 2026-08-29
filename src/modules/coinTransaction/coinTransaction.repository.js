const { prisma } =
  require("../../config/database");

function buildWhere({
  userId,
  coinPackageId,
  type,
  status,
}) {
  const where = {};

  if (userId) {
    where.userId = BigInt(userId);
  }

  if (coinPackageId) {
    where.coinPackageId =
      Number(coinPackageId);
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  return where;
}

async function listTransactions({
  page,
  limit,
  userId,
  coinPackageId,
  type,
  status,
}) {
  const where = buildWhere({
    userId,
    coinPackageId,
    type,
    status,
  });

  const skip = (page - 1) * limit;

  const [transactions, total] =
    await prisma.$transaction([
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
              mobile: true,
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

      prisma.coinTransaction.count({
        where,
      }),
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

async function findUserTransactions(
  userId,
  page,
  limit
) {
  const skip = (page - 1) * limit;

  const where = {
    userId: BigInt(userId),
  };

  const [transactions, total] =
    await prisma.$transaction([
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

      prisma.coinTransaction.count({
        where,
      }),
    ]);

  return {
    transactions,
    total,
  };
}

module.exports = {
  listTransactions,
  findById,
  findByPublicId,
  create,
  update,
  findUserTransactions,
};