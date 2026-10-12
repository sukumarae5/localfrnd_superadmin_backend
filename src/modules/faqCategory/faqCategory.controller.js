const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./faqCategory.service");

async function createCategory(req, res, next) {
  try {
    const data = await service.createCategory(req.body, req.admin?.adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, data, "FAQ category created successfully"));
  } catch (error) {
    next(error);
  }
}

async function getCategories(req, res, next) {
  try {
    const data = await service.getCategories(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQ categories fetched successfully"));
  } catch (error) {
    next(error);
  }
}

// GET /public/faq-categories — no auth, active-only
async function getActiveCategories(req, res, next) {
  try {
    const data = await service.getActiveCategories();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQ categories fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function getCategory(req, res, next) {
  try {
    const data = await service.getCategory(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQ category fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const data = await service.updateCategory(req.params.publicId, req.body, req.admin?.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQ category updated successfully"));
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await service.deleteCategory(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "FAQ category deleted successfully"));
  } catch (error) {
    next(error);
  }
}

module.exports = { createCategory, getCategories, getActiveCategories, getCategory, updateCategory, deleteCategory };