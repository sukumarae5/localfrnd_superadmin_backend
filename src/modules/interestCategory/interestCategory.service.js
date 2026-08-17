const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const interestCategoryRepository = require("./interestCategory.repository");

const derivePopularity = (score) => {
  if (score >= 90) return "high";
  if (score >= 60) return "medium";
  return "low";
};

const createCategory = async (payload, adminId) => {
  const popularity = payload.popularity || derivePopularity(payload.recommendationScore ?? 0);

  return interestCategoryRepository.create({
    ...payload,
    popularity,
    createdById: adminId ? BigInt(adminId) : undefined,
    updatedById: adminId ? BigInt(adminId) : undefined,
  });
};

const getCategories = async (query) => {
  const { page, limit, sortBy, sortDir, ...filters } = query;
  const { items, total } = await interestCategoryRepository.list(filters, { page, limit, sortBy, sortDir });
  const enriched = await interestCategoryRepository.withUserAndRjCounts(items);

  return {
    items: enriched,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  };
};

const getCategoryByPublicId = async (publicId) => {
  const category = await interestCategoryRepository.findByPublicId(publicId);
  if (!category) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Interest category not found");
  const [enriched] = await interestCategoryRepository.withUserAndRjCounts([category]);
  return enriched;
};

const updateCategory = async (publicId, payload, adminId) => {
  const existing = await interestCategoryRepository.findByPublicId(publicId);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Interest category not found");

  const data = { ...payload };
  if (typeof data.recommendationScore === "number" && !data.popularity) {
    data.popularity = derivePopularity(data.recommendationScore);
  }
  if (adminId) data.updatedById = BigInt(adminId);

  return interestCategoryRepository.update(existing.id, data);
};

const deleteCategory = async (publicId) => {
  const existing = await interestCategoryRepository.findByPublicId(publicId);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Interest category not found");
  await interestCategoryRepository.softDelete(existing.id);
};

const getStats = async () => interestCategoryRepository.getStats();

module.exports = { createCategory, getCategories, getCategoryByPublicId, updateCategory, deleteCategory, getStats };
