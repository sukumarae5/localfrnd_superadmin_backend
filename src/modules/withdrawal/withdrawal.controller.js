const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./withdrawal.service");

async function list(req, res, next) {
  try {
    const result = await service.listWithdrawals(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const withdrawal = await service.getDetail(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { withdrawal }));
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const result = await service.approve(req.params.id, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Withdrawal approved"));
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const result = await service.reject(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Withdrawal rejected"));
  } catch (err) {
    next(err);
  }
}

async function bulkApprove(req, res, next) {
  try {
    const results = await service.bulkApprove(req.body.ids, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { results }, "Bulk approval processed"));
  } catch (err) {
    next(err);
  }
}

async function bulkReject(req, res, next) {
  try {
    const results = await service.bulkReject(req.body.ids, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { results }, "Bulk rejection processed"));
  } catch (err) {
    next(err);
  }
}

async function dismissAppeal(req, res, next) {
  try {
    const result = await service.dismissAppeal(req.params.id, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Appeal dismissed"));
  } catch (err) {
    next(err);
  }
}

async function approveOverrule(req, res, next) {
  try {
    const result = await service.approveOverrule(req.params.id, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Withdrawal approved on overrule"));
  } catch (err) {
    next(err);
  }
}

// ---- RJ-facing (mobile app, authenticateRJ) ----

async function create(req, res, next) {
  try {
    const result = await service.createWithdrawalRequest(req.rj.id, req.body);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, result, "Withdrawal request submitted"));
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const result = await service.listMyWithdrawals(req.rj.id, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const withdrawal = await service.getMyWithdrawalDetail(req.rj.id, req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { withdrawal }));
  } catch (err) {
    next(err);
  }
}

async function raiseAppeal(req, res, next) {
  try {
    const result = await service.raiseAppeal(req.rj.id, req.params.id, req.body.appealMessage);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Appeal submitted for review"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  approve,
  reject,
  bulkApprove,
  bulkReject,
  dismissAppeal,
  approveOverrule,
  create,
  listMine,
  getMine,
  raiseAppeal,
};