const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./friends.service");

// Shared by /user/friends and /rj/friends — see friends.service.js's header
// comment on why req.user.id is always the right id regardless of which
// middleware authenticated the request.

async function sendRequest(req, res, next) {
  try {
    const result = await service.sendRequest(req.user.id, req.body.toUserId);
    const status = result.matched ? HTTP_STATUS.OK : HTTP_STATUS.CREATED;
    res.status(status).json(new ApiResponse(status, result, result.matched ? "You're now friends" : "Request sent"));
  } catch (err) { next(err); }
}

async function acceptRequest(req, res, next) {
  try {
    const result = await service.acceptRequest(req.body.requestPublicId, req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Request accepted"));
  } catch (err) { next(err); }
}

async function rejectRequest(req, res, next) {
  try {
    const result = await service.rejectRequest(req.body.requestPublicId, req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Request rejected"));
  } catch (err) { next(err); }
}

async function cancelRequest(req, res, next) {
  try {
    const result = await service.cancelRequest(req.body.requestPublicId, req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Request cancelled"));
  } catch (err) { next(err); }
}

async function listFriends(req, res, next) {
  try {
    const result = await service.listFriends(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Friends"));
  } catch (err) { next(err); }
}

async function listPendingReceived(req, res, next) {
  try {
    const result = await service.listPendingReceived(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Pending requests"));
  } catch (err) { next(err); }
}

async function listPendingSent(req, res, next) {
  try {
    const result = await service.listPendingSent(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Sent requests"));
  } catch (err) { next(err); }
}

async function getStatus(req, res, next) {
  try {
    const result = await service.getStatus(req.user.id, req.params.otherUserId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Friendship status"));
  } catch (err) { next(err); }
}

async function unfriend(req, res, next) {
  try {
    const result = await service.unfriend(req.user.id, req.body.otherUserId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Unfriended"));
  } catch (err) { next(err); }
}

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  listFriends,
  listPendingReceived,
  listPendingSent,
  getStatus,
  unfriend,
};