const ApiError = require(
  "../../utils/apiError.util"
);

const {
  HTTP_STATUS,
} = require("../../constants");

const repository = require(
  "./lifestyle.repository"
);

async function createLifestyle(
  payload
) {
  const category =
    await repository.findCategoryByPublicId(
      payload.categoryPublicId
    );

  if (
    !category ||
    category.status !== "active"
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Lifestyle category is invalid or inactive"
    );
  }

  const {
    categoryPublicId,
    ...data
  } = payload;

  return repository.create(
    category.id,
    data
  );
}

async function getLifestyles(
  query
) {
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
        Math.ceil(
          total / limit
        ) || 1,
    },
  };
}

async function getLifestyle(
  publicId
) {
  const lifestyle =
    await repository.findByPublicId(
      publicId
    );

  if (!lifestyle) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Lifestyle not found"
    );
  }

  return lifestyle;
}

async function updateLifestyle(
  publicId,
  payload
) {
  const existing =
    await repository.findByPublicId(
      publicId
    );

  if (!existing) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Lifestyle not found"
    );
  }

  const data = {
    ...payload,
  };

  /*
   * Change category if admin
   * selected another category.
   */
  if (payload.categoryPublicId) {
    const category =
      await repository.findCategoryByPublicId(
        payload.categoryPublicId
      );

    if (
      !category ||
      category.status !== "active"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Lifestyle category is invalid or inactive"
      );
    }

    data.categoryId = category.id;
  }

  delete data.categoryPublicId;

  if (
    data.name &&
    data.name !== existing.name
  ) {
    data.slug =
      repository.slugify(
        data.name
      );
  }

  return repository.update(
    existing.id,
    data
  );
}

async function deleteLifestyle(
  publicId
) {
  const existing =
    await repository.findByPublicId(
      publicId
    );

  if (!existing) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Lifestyle not found"
    );
  }

  await repository.softDelete(
    existing.id
  );
}

module.exports = {
  createLifestyle,
  getLifestyles,
  getLifestyle,
  updateLifestyle,
  deleteLifestyle,
};