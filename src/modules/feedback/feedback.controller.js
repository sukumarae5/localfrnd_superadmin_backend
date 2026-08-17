const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./feedback.service");

async function list(req, res, next) {
  try {
    const result = await service.listFeedback(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const item = await service.getById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { feedback: item }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const item = await service.createFeedback(req.body);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { feedback: item }, "Feedback submitted"));
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const item = await service.updateStatus(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { feedback: item }, "Status updated"));
  } catch (err) { next(err); }
}

async function assign(req, res, next) {
  try {
    const item = await service.assign(req.params.id, req.body.assignedToId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { feedback: item }, "Feedback assigned"));
  } catch (err) { next(err); }
}

async function setPriority(req, res, next) {
  try {
    const item = await service.setPriority(req.params.id, req.body.priority);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { feedback: item }, "Priority updated"));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, updateStatus, assign, setPriority };