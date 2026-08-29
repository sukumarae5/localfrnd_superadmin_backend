const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./plans.service");

async function list(req, res, next) {
  try {
    const result = await service.listPlans(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Plans fetched successfully"));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const plan = await service.getPlanDetails(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, plan, "Plan fetched successfully"));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const plan = await service.createPlan(req.body, req.files, adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, plan, "Plan created"));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const plan = await service.updatePlan(req.params.publicId, req.body, req.files, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, plan, "Plan updated"));
  } catch (err) { next(err); }
}

async function setActive(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const plan = await service.setPlanActive(req.params.publicId, req.body.isActive, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, plan, "Plan status updated"));
  } catch (err) { next(err); }
}

async function publish(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const plan = await service.publishPlan(req.params.publicId, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, plan, "Plan published live"));
  } catch (err) { next(err); }
}

async function duplicate(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const plan = await service.duplicatePlan(req.params.publicId, adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, plan, "Plan duplicated"));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    await service.deletePlan(req.params.publicId, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Plan deleted"));
  } catch (err) { next(err); }
}

async function recordView(req, res, next) {
  try {
    const result = await service.recordView(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "View recorded"));
  } catch (err) { next(err); }
}

async function dashboard(req, res, next) {
  try {
    const result = await service.getDashboard();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Dashboard fetched successfully"));
  } catch (err) { next(err); }
}

async function purchase(req, res, next) {
  try {
    const result = await service.purchasePlan(req.body);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, result, "Plan purchased successfully"));
  } catch (err) { next(err); }
}

async function refund(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const result = await service.refundPurchase(req.body.subscriptionId, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Purchase refunded"));
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

module.exports = {
  list, getOne, create, update, setActive, publish, duplicate, remove, recordView,
  dashboard, purchase, refund, listSubscriptions, assign,
};