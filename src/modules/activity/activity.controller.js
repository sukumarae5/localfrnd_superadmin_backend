const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./activity.service");

async function stats(req, res, next) {
  try {
    const result = await service.getStats();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function feed(req, res, next) {
  try {
    const logs = await service.getLiveFeed(Number(req.query.limit) || 10);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { logs }));
  } catch (err) { next(err); }
}

async function logs(req, res, next) {
  try {
    const result = await service.listLogs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function sessions(req, res, next) {
  try {
    const result = await service.listSessions(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function endSession(req, res, next) {
  try {
    const result = await service.endSession(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Session ended"));
  } catch (err) { next(err); }
}

module.exports = { stats, feed, logs, sessions, endSession };