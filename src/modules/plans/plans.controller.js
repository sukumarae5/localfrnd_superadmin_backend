const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./plans.service");

async function list(req, res, next) {
  try {
    const plans = await service.listPlans(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { plans }));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const plan = await service.getPlan(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { plan }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const plan = await service.createPlan(req.body);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { plan }, "Plan created"));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const plan = await service.updatePlan(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { plan }, "Plan updated"));
  } catch (err) { next(err); }
}

async function setActive(req, res, next) {
  try {
    const plan = await service.setPlanActive(req.params.id, req.body.isActive);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { plan }, "Plan status updated"));
  } catch (err) { next(err); }
}

async function listSubscriptions(req, res, next) {
  try {
    const result = await service.listSubscriptions(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function assign(req, res, next) {
  try {
    const sub = await service.assignSubscription(req.body, req.admin.adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { subscription: sub }, "Subscription assigned"));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, setActive, listSubscriptions, assign };