const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./calls.service");

// --- RJ side ---

async function rjStartSearch(req, res, next) {
  try {
    const result = await service.startRJSearch(req.rj.id, req.body.callType);
    const status = result.status === "matched" ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
    res.status(status).json(new ApiResponse(status, result, result.status === "matched" ? "Matched with a caller" : "Searching for a caller"));
  } catch (err) { next(err); }
}

async function rjCancelSearch(req, res, next) {
  try {
    const result = await service.cancelRJSearch(req.rj.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Search cancelled"));
  } catch (err) { next(err); }
}

async function rjActiveCall(req, res, next) {
  try {
    const result = await service.getActiveCall("rj", req.rj.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, result ? "Active call" : "No active call"));
  } catch (err) { next(err); }
}

// --- User side ---

async function userStartRandomCall(req, res, next) {
  try {
    const result = await service.startUserRandomCall(req.user.id, req.body.callType);
    const status = result.status === "matched" ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
    res.status(status).json(new ApiResponse(status, result, result.status === "matched" ? "Matched with an RJ" : "Searching for an RJ"));
  } catch (err) { next(err); }
}

async function userCancelSearch(req, res, next) {
  try {
    const result = await service.cancelUserSearch(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Search cancelled"));
  } catch (err) { next(err); }
}

async function userActiveCall(req, res, next) {
  try {
    const result = await service.getActiveCall("user", req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, result ? "Active call" : "No active call"));
  } catch (err) { next(err); }
}

// --- User: local + direct call ---

async function userStartLocalCall(req, res, next) {
  try {
    const result = await service.startLocalCall(req.user.id, req.body.callType);
    const status = result.status === "matched" ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
    res.status(status).json(new ApiResponse(status, result, "Matched with a nearby RJ"));
  } catch (err) { next(err); }
}

async function userStartDirectCall(req, res, next) {
  try {
    const result = await service.startDirectCall(req.user.id, req.params.rjId, req.body.callType);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, result, "Ringing RJ"));
  } catch (err) { next(err); }
}

async function userCancelRinging(req, res, next) {
  try {
    const result = await service.cancelRingingCall(req.user.id, req.body.sessionPublicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call cancelled"));
  } catch (err) { next(err); }
}

async function listAvailableRJs(req, res, next) {
  try {
    const result = await service.listAvailableRJs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Available RJs"));
  } catch (err) { next(err); }
}

// --- RJ: respond to a direct call ---

async function rjAcceptDirectCall(req, res, next) {
  try {
    const result = await service.acceptDirectCall(req.rj.id, req.body.sessionPublicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call accepted"));
  } catch (err) { next(err); }
}

async function rjRejectDirectCall(req, res, next) {
  try {
    const result = await service.rejectDirectCall(req.rj.id, req.body.sessionPublicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call rejected"));
  } catch (err) { next(err); }
}

// --- Shared: REST fallback for ending a call ---

async function endCall(req, res, next) {
  try {
    const actorType = req.rj ? "rj" : "user";
    const result = await service.endCall(req.body.sessionPublicId, actorType);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call ended"));
  } catch (err) { next(err); }
}

// --- Admin: call history / monitoring ---

async function adminListCalls(req, res, next) {
  try {
    const result = await service.adminListCalls(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call history"));
  } catch (err) { next(err); }
}

async function adminGetCallDetail(req, res, next) {
  try {
    const result = await service.adminGetCallDetail(req.params.sessionPublicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call detail"));
  } catch (err) { next(err); }
}

async function adminForceEndCall(req, res, next) {
  try {
    const result = await service.adminForceEndCall(req.params.sessionPublicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call force-ended"));
  } catch (err) { next(err); }
}

// --- User: call history ---

async function userCallHistory(req, res, next) {
  try {
    const result = await service.listUserCallHistory(req.user.id, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call history"));
  } catch (err) { next(err); }
}

async function userRecentContacts(req, res, next) {
  try {
    const result = await service.listUserRecentContacts(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Recent contacts"));
  } catch (err) { next(err); }
}

async function userHistoryWithContact(req, res, next) {
  try {
    const result = await service.listUserHistoryWithRJ(req.user.id, req.params.counterpartUserId, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call history with this person"));
  } catch (err) { next(err); }
}

// --- RJ: call history ---

async function rjCallHistory(req, res, next) {
  try {
    const result = await service.listRJCallHistory(req.rj.id, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call history"));
  } catch (err) { next(err); }
}

async function rjRecentContacts(req, res, next) {
  try {
    const result = await service.listRJRecentContacts(req.rj.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Recent contacts"));
  } catch (err) { next(err); }
}

async function rjHistoryWithContact(req, res, next) {
  try {
    const result = await service.listRJHistoryWithUser(req.rj.id, req.params.counterpartUserId, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Call history with this person"));
  } catch (err) { next(err); }
}

module.exports = {
  rjStartSearch, rjCancelSearch, rjActiveCall, rjAcceptDirectCall, rjRejectDirectCall,
  userStartRandomCall, userCancelSearch, userActiveCall, userStartLocalCall,
  userStartDirectCall, userCancelRinging, listAvailableRJs, endCall,
  adminListCalls, adminGetCallDetail, adminForceEndCall,
  userCallHistory, userRecentContacts, userHistoryWithContact,
  rjCallHistory, rjRecentContacts, rjHistoryWithContact,
};