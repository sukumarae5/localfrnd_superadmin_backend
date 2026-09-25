const ApiError = require(
  "../../utils/apiError.util"
);

const {
  HTTP_STATUS,
} = require("../../constants");

const repository = require(
  "./userLifestyle.repository"
);

/**
 * Get all active lifestyle categories
 * and options for mobile app.
 */
async function getSelectableLifestyles() {
  return repository.listSelectable();
}

/**
 * Get user's selected lifestyles.
 */
async function getMyLifestyles(
  userId
) {
  return repository.findByUserId(
    userId
  );
}

/**
 * Save / replace user's lifestyles.
 */
async function setMyLifestyles(
  userId,
  publicIds
) {
  /**
   * Find all requested lifestyles.
   */
  const lifestyles =
    await repository.findActiveByPublicIds(
      publicIds
    );

  /**
   * Make sure every submitted ID exists
   * and is active.
   */
  if (
    lifestyles.length !==
    publicIds.length
  ) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "One or more lifestyle options are invalid or inactive"
    );
  }

  /**
   * Group selected lifestyles by category.
   *
   * Example:
   *
   * Eating
   *   Vegetarian
   *   Non-Vegetarian
   *
   * Drinking
   *   Never
   */
  const selectedByCategory =
    new Map();

  for (const lifestyle of lifestyles) {
    const categoryId =
      lifestyle.category.id.toString();

    if (
      !selectedByCategory.has(
        categoryId
      )
    ) {
      selectedByCategory.set(
        categoryId,
        []
      );
    }

    selectedByCategory
      .get(categoryId)
      .push(lifestyle);
  }

  /**
   * Check single-selection categories.
   */
  for (
    const [
      categoryId,
      selectedItems,
    ] of selectedByCategory
  ) {
    if (
      selectedItems.length <= 1
    ) {
      continue;
    }

    const category =
      selectedItems[0].category;

    if (
      category.selectionType ===
      "single"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Only one option can be selected from "${category.name}"`
      );
    }
  }

  /**
   * Save selections.
   */
  return repository.replaceUserLifestyles(
    userId,
    lifestyles.map(
      (item) => item.id
    )
  );
}

module.exports = {
  getSelectableLifestyles,
  getMyLifestyles,
  setMyLifestyles,
};