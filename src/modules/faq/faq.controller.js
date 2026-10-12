const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./faq.service");

async function createFaq(req, res, next) {
  try {
    const data = await service.createFaq(req.body);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, data, "FAQ created successfully"));
  } catch (error) {
    next(error);
  }
}

async function getFaqs(req, res, next) {
  try {
    const data = await service.getFaqs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQs fetched successfully"));
  } catch (error) {
    next(error);
  }
}

// GET /public/faqs — no auth, published-only
async function getPublishedFaqs(req, res, next) {
  try {
    const data = await service.getPublishedFaqs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQs fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function getFaq(req, res, next) {
  try {
    const data = await service.getFaq(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQ fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function updateFaq(req, res, next) {
  try {
    const data = await service.updateFaq(req.params.publicId, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "FAQ updated successfully"));
  } catch (error) {
    next(error);
  }
}

async function deleteFaq(req, res, next) {
  try {
    await service.deleteFaq(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "FAQ deleted successfully"));
  } catch (error) {
    next(error);
  }
}

module.exports = { createFaq, getFaqs, getPublishedFaqs, getFaq, updateFaq, deleteFaq };