const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");

const repo = require("./coinPackage.repository");

function serializeCoinPackage(item) {
  return {
    id: item.id,
    publicId: item.publicId,

    name: item.name,
    description: item.description,

    coins: item.coins,
    bonusCoins: item.bonusCoins,
    totalCoins: item.totalCoins,

    price: Number(item.price),
    currency: item.currency,

    isPopular: item.isPopular,
    sortOrder: item.sortOrder,
    status: item.status,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function listCoinPackages(query) {
  const page = Number(query.page) || 1;

  const limit = Math.min(
    Number(query.limit) || 20,
    100
  );

  const { packages, total } =
    await repo.listCoinPackages({
      page,
      limit,
      search: query.search,
      status: query.status,
    });

  return {
    packages: packages.map(serializeCoinPackage),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getCoinPackageById(id) {
  const coinPackage = await repo.findById(id);

  if (!coinPackage || coinPackage.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Coin package not found"
    );
  }

  return serializeCoinPackage(coinPackage);
}

async function createCoinPackage(
  data,
  createdById
) {
  const totalCoins =
    Number(data.coins) +
    Number(data.bonusCoins || 0);

  if (data.isPopular === true) {
    await repo.setAllNotPopular();
  }

  const created = await repo.create({
    name: data.name,
    description: data.description || null,

    coins: Number(data.coins),
    bonusCoins: Number(data.bonusCoins || 0),
    totalCoins,

    price: data.price,
    currency: data.currency || "INR",

    isPopular: data.isPopular || false,
    sortOrder: Number(data.sortOrder || 0),

    status: data.status || "active",

    createdById: createdById
      ? BigInt(createdById)
      : null,
  });

  return serializeCoinPackage(created);
}

async function updateCoinPackage(
  id,
  data,
  updatedById
) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Coin package not found"
    );
  }

  const coins =
    data.coins !== undefined
      ? Number(data.coins)
      : existing.coins;

  const bonusCoins =
    data.bonusCoins !== undefined
      ? Number(data.bonusCoins)
      : existing.bonusCoins;

  const updateData = {
    ...data,

    coins,
    bonusCoins,

    totalCoins:
      coins + bonusCoins,

    updatedById: updatedById
      ? BigInt(updatedById)
      : null,
  };

  if (data.isPopular === true) {
    await repo.setAllNotPopular();
  }

  const updated = await repo.update(
    id,
    updateData
  );

  return serializeCoinPackage(updated);
}

async function updatePackageStatus(
  id,
  status,
  updatedById
) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Coin package not found"
    );
  }

  const updated = await repo.update(id, {
    status,

    updatedById: updatedById
      ? BigInt(updatedById)
      : null,
  });

  return serializeCoinPackage(updated);
}

async function updatePackagePopular(
  id,
  isPopular,
  updatedById
) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Coin package not found"
    );
  }

  if (isPopular) {
    await repo.setAllNotPopular();
  }

  const updated = await repo.update(id, {
    isPopular,

    updatedById: updatedById
      ? BigInt(updatedById)
      : null,
  });

  return serializeCoinPackage(updated);
}

async function reorderCoinPackages(
  packages,
  updatedById
) {
  for (const item of packages) {
    const existing = await repo.findById(item.id);

    if (!existing || existing.deletedAt) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Coin package ${item.id} not found`
      );
    }
  }

  const updatedPackages =
    await repo.reorderPackages(
      packages.map((item) => ({
        ...item,
        updatedById: updatedById
          ? BigInt(updatedById)
          : null,
      }))
    );

  return updatedPackages.map(
    serializeCoinPackage
  );
}

async function deleteCoinPackage(id) {
  const existing = await repo.findById(id);

  if (!existing || existing.deletedAt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Coin package not found"
    );
  }

  await repo.softDelete(id);

  return {
    id: Number(id),
    deleted: true,
  };
}

async function getActiveCoinPackages() {
  const packages =
    await repo.getActivePackages();

  return packages.map(
    serializeCoinPackage
  );
}

module.exports = {
  listCoinPackages,
  getCoinPackageById,
  createCoinPackage,
  updateCoinPackage,
  updatePackageStatus,
  updatePackagePopular,
  reorderCoinPackages,
  deleteCoinPackage,
  getActiveCoinPackages,
};