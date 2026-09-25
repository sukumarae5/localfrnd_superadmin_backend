const {
  prisma,
} = require("../../config/database");

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const defaultInclude = {
  category: {
    select: {
      publicId: true,
      displayCode: true,
      name: true,
      selectionType: true,
    },
  },

  _count: {
    select: {
      userLifestyles: true,
    },
  },
};

async function create(
  categoryId,
  data
) {
  let slug = slugify(data.name);

  const existing =
    await prisma.lifestyle.findUnique({
      where: {
        categoryId_slug: {
          categoryId: BigInt(categoryId),
          slug,
        },
      },
    });

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  return prisma.lifestyle.create({
    data: {
      ...data,
      categoryId: BigInt(categoryId),
      slug,
    },

    include: defaultInclude,
  });
}

async function findByPublicId(
  publicId
) {
  return prisma.lifestyle.findFirst({
    where: {
      publicId,
      deletedAt: null,
    },

    include: defaultInclude,
  });
}

async function findCategoryByPublicId(
  publicId
) {
  return prisma.lifestyleCategory.findFirst({
    where: {
      publicId,
      deletedAt: null,
    },
  });
}

async function list(
  filters,
  {
    page,
    limit,
    sortBy,
    sortDir,
  }
) {
  const where = {
    deletedAt: null,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.categoryPublicId) {
    where.category = {
      publicId: filters.categoryPublicId,
      deletedAt: null,
    };
  }

  if (filters.search) {
    where.name = {
      contains: filters.search,
      mode: "insensitive",
    };
  }

  const skip =
    (page - 1) * limit;

  const [
    items,
    total,
  ] = await prisma.$transaction([
    prisma.lifestyle.findMany({
      where,

      include: defaultInclude,

      orderBy: {
        [sortBy]: sortDir,
      },

      skip,
      take: limit,
    }),

    prisma.lifestyle.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

async function update(
  id,
  data
) {
  return prisma.lifestyle.update({
    where: {
      id: BigInt(id),
    },

    data,

    include: defaultInclude,
  });
}

async function softDelete(
  id
) {
  return prisma.lifestyle.update({
    where: {
      id: BigInt(id),
    },

    data: {
      deletedAt: new Date(),
      status: "inactive",
    },
  });
}

module.exports = {
  create,
  findByPublicId,
  findCategoryByPublicId,
  list,
  update,
  softDelete,
  slugify,
};