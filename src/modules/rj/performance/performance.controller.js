// src/modules/rj/performance/performance.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../../constants");
const service = require("./performance.service");

async function list(req, res, next) {
  try {
    const result = await service.listRJs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function deepDive(req, res, next) {
  try {
    const result = await service.getDeepDive(req.params.rjId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function recompute(req, res, next) {
  try {
    const result = await service.recomputeSnapshot(req.params.rjId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Performance recomputed"));
  } catch (err) { next(err); }
}

module.exports = { list, deepDive, recompute };