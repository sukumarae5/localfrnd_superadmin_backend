const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repository = require("./faq.repository");

async function createFaq(payload) {
  const category = await repository.findCategoryByPublicId(payload.categoryPublicId);
  if (!category || category.status !== "active") {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "FAQ category is invalid or inactive");
  }

  const { categoryPublicId, ...data } = payload;
  return repository.create(category.id, data);
}

async function getFaqs(query) {
  const { page, limit, sortBy, sortDir, ...filters } = query;
  const { items, total } = await repository.list(filters, { page, limit, sortBy, sortDir });
  return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
}

// Public (app) — published FAQs only, no pagination
async function getPublishedFaqs(query) {
  return repository.listPublished(query);
}

async function getFaq(publicId) {
  const faq = await repository.findByPublicId(publicId);
  if (!faq) throw new ApiError(HTTP_STATUS.NOT_FOUND, "FAQ not found");
  return faq;
}

async function updateFaq(publicId, payload) {
  const existing = await repository.findByPublicId(publicId);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "FAQ not found");

  const data = { ...payload };

  if (payload.categoryPublicId) {
    const category = await repository.findCategoryByPublicId(payload.categoryPublicId);
    if (!category || category.status !== "active") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "FAQ category is invalid or inactive");
    }
    data.categoryId = category.id;
  }
  delete data.categoryPublicId;

  return repository.update(existing.id, data);
}

async function deleteFaq(publicId) {
  const existing = await repository.findByPublicId(publicId);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "FAQ not found");
  await repository.softDelete(existing.id);
}

module.exports = { createFaq, getFaqs, getPublishedFaqs, getFaq, updateFaq, deleteFaq };