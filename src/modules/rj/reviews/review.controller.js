// src/modules/rj/review/review.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../../constants");
const service = require("./review.service");

async function list(req, res, next) {
  try {
    const result = await service.listReviews(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const review = await service.getReviewById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { review }));
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    const review = await service.submitReview(req.body);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { review }, "Review submitted"));
  } catch (err) { next(err); }
}

async function moderate(req, res, next) {
  try {
    const review = await service.moderate(req.params.id, req.body.action, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { review }, "Review moderated"));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, submit, moderate };