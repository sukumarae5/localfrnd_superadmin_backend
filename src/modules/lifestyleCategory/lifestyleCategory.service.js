const ApiError = require("../../utils/apiError.util");
const {
  HTTP_STATUS,
} = require("../../constants");

const repository = require(
  "./lifestyleCategory.repository"
);

async function createCategory(
  payload,
  adminId
) {
  return repository.create({
    ...payload,

    createdById: adminId
      ? BigInt(adminId)
      : undefined,

    updatedById: adminId
      ? BigInt(adminId)
      : undefined,
  });
}

async function getCategories(query) {
  const {
    page,
    limit,
    sortBy,
    sortDir,
    ...filters
  } = query;

  const {
    items,
    total,
  } = await repository.list(
    filters,
    {
      page,
      limit,
      sortBy,
      sortDir,
    }
  );

  return {
    items,

    meta: {
      total,
      page,
      limit,
      totalPages:
        Math.ceil(total / limit) || 1,
    },
  };
}

async function getCategory(publicId) {
  const category =
    await repository.findByPublicId(
      publicId
    );

  if (!category) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Lifestyle category not found"
    );
  }

  return category;
}

async function updateCategory(
  publicId,
  payload,
  adminId
) {
  const existing =
    await repository.findByPublicId(
      publicId
    );

  if (!existing) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Lifestyle category not found"
    );
  }

  const data = {
    ...payload,
  };

  if (
    data.name &&
    data.name !== existing.name
  ) {
    data.slug =
      repository.slugify(data.name);
  }

  if (adminId) {
    data.updatedById = BigInt(adminId);
  }

  return repository.update(
    existing.id,
    data
  );
}

async function deleteCategory(publicId) {
  const existing =
    await repository.findByPublicId(
      publicId
    );

  if (!existing) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Lifestyle category not found"
    );
  }

  await repository.softDelete(
    existing.id
  );
}

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};