const ApiResponse = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./bankAccount.service");

async function list(req, res, next) {
  try {
    const result = await service.listBankAccounts(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const bankAccount = await service.getDetail(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { bankAccount }));
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const result = await service.approve(req.params.id, req.admin.adminId, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Bank account approved"));
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const result = await service.reject(req.params.id, req.admin.adminId, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Bank account rejected"));
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const result = await service.addNote(req.params.id, req.admin.adminId, req.body.note);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Note added"));
  } catch (err) {
    next(err);
  }
}

async function retryPennyDrop(req, res, next) {
  try {
    const result = await service.retryPennyDrop(req.params.id, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Penny drop test re-triggered"));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, approve, reject, addNote, retryPennyDrop };