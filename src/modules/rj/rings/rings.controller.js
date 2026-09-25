// src/modules/rj/rings/rings.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../../constants");
const service = require("./rings.service");

// ---- RJ-facing (req.rj.id from authenticateRJ) ----

async function getMySummary(req, res, next) {
  try {
    const summary = await service.getMyRingsSummary(req.rj.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, summary));
  } catch (err) {
    next(err);
  }
}

async function listMyHistory(req, res, next) {
  try {
    const result = await service.listMyRingHistory(req.rj.id, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function convert(req, res, next) {
  try {
    const result = await service.convertMyRings(req.rj.id, req.body.rings);
    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result, "Rings converted successfully"));
  } catch (err) {
    next(err);
  }
}

// ---- Admin-facing ----

async function getSettings(req, res, next) {
  try {
    const settings = await service.getSettings();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, settings));
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await service.updateSettings(req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, settings, "Ring settings updated"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMySummary,
  listMyHistory,
  convert,
  getSettings,
  updateSettings,
};