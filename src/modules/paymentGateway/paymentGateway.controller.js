const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

const service = require("./paymentGateway.service");

function toAdminId(req) {
  return req.admin?.adminId;
}

async function list(req, res, next) {
  try {
    const gateways = await service.listGateways();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { gateways }));
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const gateway = await service.getGatewayById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { gateway }));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const gateway = await service.createGateway(req.body, toAdminId(req));
    res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, { gateway }, "Gateway config created"));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const gateway = await service.updateGateway(req.params.id, req.body, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { gateway }, "Gateway config updated"));
  } catch (error) {
    next(error);
  }
}

async function ledger(req, res, next) {
  try {
    const gateways = await service.getLedger();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { gateways }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  ledger,
};
