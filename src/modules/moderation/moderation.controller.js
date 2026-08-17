// src/modules/moderation/moderation.controller.js
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./moderation.service");

async function list(req, res, next) {
  try {
    const result = await service.listBlockedUsers(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const detail = await service.getModerationDetail(req.params.userId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, detail));
  } catch (err) { next(err); }
}

async function updateBlock(req, res, next) {
  try {
    const detail = await service.updateBlock(req.params.userId, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, detail, "Block updated"));
  } catch (err) { next(err); }
}

async function unblock(req, res, next) {
  try {
    const detail = await service.unblockUser(req.params.userId, req.body.reason, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, detail, "User unblocked"));
  } catch (err) { next(err); }
}

async function decideAppeal(req, res, next) {
  try {
    const result = await service.decideAppeal(req.params.appealId, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Appeal decision recorded"));
  } catch (err) { next(err); }
}

async function audit(req, res, next) {
  try {
    const trail = await service.getAuditTrail(req.params.userId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, trail));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, updateBlock, unblock, decideAppeal, audit };