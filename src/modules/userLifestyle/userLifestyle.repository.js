const {
  prisma,
} = require("../../config/database");

/**
 * Get all active lifestyle categories
 * and their active lifestyle options.
 *
 * This is used by the mobile app when
 * displaying the lifestyle selection screen.
 */
async function listSelectable() {
  return prisma.lifestyleCategory.findMany({
    where: {
      deletedAt: null,
      status: "active",

      lifestyles: {
        some: {
          deletedAt: null,
          status: "active",
        },
      },
    },

    orderBy: {
      sortOrder: "asc",
    },

    select: {
      publicId: true,
      displayCode: true,
      name: true,
      description: true,
      icon: true,
      selectionType: true,
      sortOrder: true,

      lifestyles: {
        where: {
          deletedAt: null,
          status: "active",
        },

        orderBy: {
          sortOrder: "asc",
        },

        select: {
          publicId: true,
          name: true,
          description: true,
          sortOrder: true,
        },
      },
    },
  });
}

/**
 * Find lifestyle records by their public IDs.
 *
 * Only active records are allowed to be
 * selected by users.
 */
async function findActiveByPublicIds(
  publicIds
) {
  return prisma.lifestyle.findMany({
    where: {
      publicId: {
        in: publicIds,
      },

      deletedAt: null,

      status: "active",

      category: {
        deletedAt: null,
        status: "active",
      },
    },

    include: {
      category: {
        select: {
          id: true,
          publicId: true,
          name: true,
          selectionType: true,
        },
      },
    },
  });
}

/**
 * Replace all existing lifestyle selections
 * for the user.
 */
async function replaceUserLifestyles(
  userId,
  lifestyleIds
) {
  return prisma.$transaction(
    async (tx) => {
      const uid = BigInt(userId);

      /**
       * Remove previous selections.
       */
      await tx.userLifestyle.deleteMany({
        where: {
          userId: uid,
        },
      });

      /**
       * Insert new selections.
       */
      if (lifestyleIds.length > 0) {
        await tx.userLifestyle.createMany({
          data: lifestyleIds.map(
            (lifestyleId) => ({
              userId: uid,
              lifestyleId,
            })
          ),
        });
      }

      /**
       * Return updated selections.
       */
      return tx.userLifestyle.findMany({
        where: {
          userId: uid,
        },

        include: {
          lifestyle: {
            include: {
              category: true,
            },
          },
        },
      });
    }
  );
}

/**
 * Get current user's selected lifestyles.
 */
async function findByUserId(userId) {
  return prisma.userLifestyle.findMany({
    where: {
      userId: BigInt(userId),
    },

    include: {
      lifestyle: {
        include: {
          category: true,
        },
      },
    },

    orderBy: {
      lifestyle: {
        sortOrder: "asc",
      },
    },
  });
}

module.exports = {
  listSelectable,
  findActiveByPublicIds,
  replaceUserLifestyles,
  findByUserId,
};