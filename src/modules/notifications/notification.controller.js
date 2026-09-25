const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./notification.service");

// Shared by /user/notifications and /rj/notifications — both authenticateUser
// and authenticateRJ set req.user.id to the same underlying User.id, and the
// social layer never needs to know whether the caller is a plain User or an
// RJ (see social.prisma's header comment).

async function listNotifications(req, res, next) {
  try {
    const result = await service.listNotifications(req.user.id, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Notifications"));
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    const result = await service.markAllRead(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Marked as read"));
  } catch (err) { next(err); }
}

async function unreadCount(req, res, next) {
  try {
    const result = await service.getUnreadCount(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Unread count"));
  } catch (err) { next(err); }
}

module.exports = { listNotifications, markAllRead, unreadCount };