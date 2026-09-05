const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

const service = require("./payments.service");

async function list(req, res, next) {
  try {
    const result = await service.listPayments(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const payment = await service.getPaymentByIdOrCode(req.params.idOrCode);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { payment }));
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

module.exports = {
  list,
  getOne,
  dashboard,
};
