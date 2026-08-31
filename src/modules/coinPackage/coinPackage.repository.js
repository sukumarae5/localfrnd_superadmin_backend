const { prisma } = require("../../config/database");

function buildWhere({ search, status }) {
  const where = {
    deletedAt: null,
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  return where;
}

async function listCoinPackages({ page, limit, search, status }) {
  const where = buildWhere({ search, status });

  const skip = (page - 1) * limit;

  const [packages, total] = await prisma.$transaction([
    prisma.coinPackage.findMany({
      where,
      skip,
      take: limit,

      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    }),

    prisma.coinPackage.count({ where }),
  ]);

  return {
    packages,
    total,
  };
}

async function findById(id) {
  return prisma.coinPackage.findUnique({
    where: {
      id: Number(id),
    },
  });
}

async function create(data) {
  return prisma.coinPackage.create({
    data,
  });
}

async function update(id, data) {
  return prisma.coinPackage.update({
    where: {
      id: Number(id),
    },
    data,
  });
}

/*
Only one package can be flagged isPopular at a
time. Called before create/update whenever the
incoming payload sets isPopular = true, so the
previous popular package(s) get unset first.
Scoped to non-deleted rows only.
*/

async function setAllNotPopular() {
  return prisma.coinPackage.updateMany({
    where: {
      isPopular: true,
      deletedAt: null,
    },
    data: {
      isPopular: false,
    },
  });
}

/*
Sequential loop, not Promise.all -- matches the
project convention for bulk writes so sortOrder
updates can't interleave and land out of order.
*/

async function reorderPackages(packages) {
  const updated = [];

  for (const item of packages) {
    // eslint-disable-next-line no-await-in-loop
    const result = await prisma.coinPackage.update({
      where: {
        id: Number(item.id),
      },
      data: {
        sortOrder: Number(item.sortOrder),
        updatedById: item.updatedById,
      },
    });

    updated.push(result);
  }

  return updated;
}

async function softDelete(id) {
  return prisma.coinPackage.update({
    where: {
      id: Number(id),
    },
    data: {
      deletedAt: new Date(),
      status: "inactive",
    },
  });
}

async function getActivePackages() {
  return prisma.coinPackage.findMany({
    where: {
      status: "active",
      deletedAt: null,
    },

    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });
}

module.exports = {
  listCoinPackages,
  findById,
  create,
  update,
  setAllNotPopular,
  reorderPackages,
  softDelete,
  getActivePackages,
};