const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./chat.service");

async function getMessages(req, res, next) {
  try {
    const result = await service.getMessages(req.user.id, req.params.otherUserId, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Messages"));
  } catch (err) { next(err); }
}

async function listConversations(req, res, next) {
  try {
    const result = await service.listConversations(req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Conversations"));
  } catch (err) { next(err); }
}

async function markConversationRead(req, res, next) {
  try {
    const result = await service.markConversationRead(req.params.conversationId, req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Marked as read"));
  } catch (err) { next(err); }
}

async function deleteMessage(req, res, next) {
  try {
    const result = await service.deleteMessage(req.params.messageId, req.user.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Message deleted"));
  } catch (err) { next(err); }
}

module.exports = { getMessages, listConversations, markConversationRead, deleteMessage };