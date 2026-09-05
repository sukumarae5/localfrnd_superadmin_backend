const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

const service = require("./refunds.service");

function toAdminId(req) {
  return req.admin?.adminId;
}

async function list(req, res, next) {
  try {
    const result = await service.listRefunds(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const refund = await service.getRefundByIdOrCode(req.params.idOrCode);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { refund }));
  } catch (error) {
    next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    const result = await service.getDashboard();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const refund = await service.requestRefund(req.body, toAdminId(req));
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { refund }, "Refund requested"));
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const refund = await service.approveRefund(req.params.id, req.body, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { refund }, "Refund approved and wallet credited"));
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const refund = await service.rejectRefund(req.params.id, req.body, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { refund }, "Refund rejected"));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getOne,
  dashboard,
  create,
  approve,
  reject,
};
