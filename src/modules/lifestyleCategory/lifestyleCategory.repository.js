const { prisma } = require("../../config/database");

const DISPLAY_CODE_PREFIX = "LC";

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateDisplayCode(tx) {
  const count = await tx.lifestyleCategory.count();

  let attempt = count + 1;

  for (let i = 0; i < 100; i++) {
    const candidate =
      `${DISPLAY_CODE_PREFIX}-` +
      String(attempt).padStart(3, "0");

    const exists =
      await tx.lifestyleCategory.findUnique({
        where: {
          displayCode: candidate,
        },
        select: {
          id: true,
        },
      });

    if (!exists) {
      return candidate;
    }

    attempt++;
  }

  throw new Error(
    "Unable to generate unique lifestyle category display code"
  );
}

const defaultInclude = {
  _count: {
    select: {
      lifestyles: true,
    },
  },
};

async function create(data) {
  return prisma.$transaction(async (tx) => {
    const displayCode =
      await generateDisplayCode(tx);

    let slug = slugify(data.name);

    const existing =
      await tx.lifestyleCategory.findUnique({
        where: {
          slug,
        },
      });

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    return tx.lifestyleCategory.create({
      data: {
        ...data,
        displayCode,
        slug,
      },
      include: defaultInclude,
    });
  });
}

async function findByPublicId(publicId) {
  return prisma.lifestyleCategory.findFirst({
    where: {
      publicId,
      deletedAt: null,
    },
    include: {
      ...defaultInclude,

      lifestyles: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
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

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        displayCode: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] =
    await prisma.$transaction([
      prisma.lifestyleCategory.findMany({
        where,

        include: defaultInclude,

        orderBy: {
          [sortBy]: sortDir,
        },

        skip,
        take: limit,
      }),

      prisma.lifestyleCategory.count({
        where,
      }),
    ]);

  return {
    items,
    total,
  };
}

async function update(id, data) {
  return prisma.lifestyleCategory.update({
    where: {
      id: BigInt(id),
    },

    data,

    include: defaultInclude,
  });
}

async function softDelete(id) {
  return prisma.lifestyleCategory.update({
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
  list,
  update,
  softDelete,
  slugify,
};