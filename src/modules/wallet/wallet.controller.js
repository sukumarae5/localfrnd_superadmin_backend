const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./wallet.service");

async function list(req, res, next) {
  try {
    const result = await service.listWallets(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const wallet = await service.getWalletDetail(req.params.userId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { wallet }));
  } catch (err) { next(err); }
}

async function transactions(req, res, next) {
  try {
    const result = await service.listTransactions(req.params.userId, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function credit(req, res, next) {
  try {
    const result = await service.creditWallet(req.params.userId, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Wallet credited"));
  } catch (err) { next(err); }
}

async function debit(req, res, next) {
  try {
    const result = await service.debitWallet(req.params.userId, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Wallet debited"));
  } catch (err) { next(err); }
}

async function freeze(req, res, next) {
  try {
    const result = await service.setFrozen(req.params.userId, req.body.isFrozen, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, result.isFrozen ? "Wallet frozen" : "Wallet unfrozen"));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, transactions, credit, debit, freeze };