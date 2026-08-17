const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const interestCategoryService = require("./interestCategory.service");

const createCategory = async (req, res, next) => {
  try {
    const category = await interestCategoryService.createCategory(req.body, req.admin?.adminId);
    return res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, category, "Interest category created"));
  } catch (err) {
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const result = await interestCategoryService.getCategories(req.query);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { items: result.items, meta: result.meta }, "Interest categories fetched"));
  } catch (err) {
    next(err);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await interestCategoryService.getCategoryByPublicId(req.params.publicId);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, category, "Interest category fetched"));
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await interestCategoryService.updateCategory(req.params.publicId, req.body, req.admin?.adminId);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, category, "Interest category updated"));
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    await interestCategoryService.deleteCategory(req.params.publicId);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Interest category deleted"));
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await interestCategoryService.getStats();
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, stats, "Interest category stats fetched"));
  } catch (err) {
    next(err);
  }
};

module.exports = { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory, getStats };
