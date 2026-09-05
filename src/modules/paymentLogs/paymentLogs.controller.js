const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

const service = require("./paymentLogs.service");

async function list(req, res, next) {
  try {
    const result = await service.listLogs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const log = await service.getLogById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { log }));
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
