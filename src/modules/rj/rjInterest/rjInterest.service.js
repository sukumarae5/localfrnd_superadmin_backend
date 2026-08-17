const ApiError = require("../../../utils/apiError.util");
const { HTTP_STATUS } = require("../../../constants");
const rjInterestRepository = require("./rjInterest.repository");
const interestCategoryRepository = require("../../interestCategory/interestCategory.repository");

const resolveCategoryOrThrow = async (publicId) => {
  const category = await interestCategoryRepository.findByPublicId(publicId);
  if (!category) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Interest category not found");
  return category;
};

const assignRjToCategory = async (rjId, categoryPublicId, adminId) => {
  const category = await resolveCategoryOrThrow(categoryPublicId);
  return rjInterestRepository.assign(rjId, category.id, adminId);
};

const unassignRjFromCategory = async (rjId, categoryPublicId) => {
  const category = await resolveCategoryOrThrow(categoryPublicId);
  return rjInterestRepository.unassign(rjId, category.id);
};

const setMyInterests = async (rjId, categoryPublicIds) => {
  const categories = await Promise.all(categoryPublicIds.map(resolveCategoryOrThrow));
  return rjInterestRepository.replaceForRj(rjId, categories.map((c) => c.id));
};

const getRjsForCategory = async (categoryPublicId, pagination) => {
  const category = await resolveCategoryOrThrow(categoryPublicId);
  return rjInterestRepository.findByCategory(category.id, pagination);
};

const getRecommendedRjsForUser = async (userId, limit) =>
  rjInterestRepository.findRecommendedRjsForUser(userId, limit);

module.exports = {
  assignRjToCategory,
  unassignRjFromCategory,
  setMyInterests,
  getRjsForCategory,
  getRecommendedRjsForUser,
};