// src/modules/rj/status/status.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../../constants");
const service = require("./status.service");

async function listOnline(req, res, next) {
  try {
    const result = await service.listOnlineRJs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function listOffline(req, res, next) {
  try {
    const result = await service.listOfflineRJs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function liveActivity(req, res, next) {
  try {
    const activity = await service.getLiveActivity(req.query.limit);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { activity }));
  } catch (err) { next(err); }
}

async function callMonitoring(req, res, next) {
  try {
    const monitoring = await service.getCallMonitoring(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, monitoring));
  } catch (err) { next(err); }
}

async function endCall(req, res, next) {
  try {
    const result = await service.forceEndCall(req.params.callId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call ended"));
  } catch (err) { next(err); }
}

async function heartbeat(req, res, next) {
  try {
    const result = await service.recordHeartbeat(req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function goOffline(req, res, next) {
  try {
    const result = await service.goOffline(req.params.id, req.body.reason);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "RJ marked offline"));
  } catch (err) { next(err); }
}

async function sendNotification(req, res, next) {
  try {
    const result = await service.sendOfflineNotification(req.body.rjIds, req.body.message);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Notification queued"));
  } catch (err) { next(err); }
}

module.exports = { listOnline, listOffline, liveActivity, callMonitoring, endCall, heartbeat, goOffline, sendNotification };