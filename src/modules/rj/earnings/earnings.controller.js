// src/modules/rj/earnings/earnings.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../../constants");
const service = require("./earnings.service");

async function list(req, res, next) {
  try {
    const result = await service.listEarnings(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const detail = await service.getEarningsDetail(req.params.rjId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, detail));
  } catch (err) { next(err); }
}

async function transactions(req, res, next) {
  try {
    const result = await service.listTransactions(req.params.rjId, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function payout(req, res, next) {
  try {
    const result = await service.processPayout(req.params.rjId, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Payout processed"));
  } catch (err) { next(err); }
}

async function bonus(req, res, next) {
  try {
    const result = await service.addBonus(req.params.rjId, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Bonus added"));
  } catch (err) { next(err); }
}

async function commission(req, res, next) {
  try {
    const result = await service.editCommission(req.params.rjId, req.body.commissionRate, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Commission updated"));
  } catch (err) { next(err); }
}

async function statement(req, res, next) {
  try {
    const result = await service.getStatement(req.params.rjId, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, transactions, payout, bonus, commission, statement };