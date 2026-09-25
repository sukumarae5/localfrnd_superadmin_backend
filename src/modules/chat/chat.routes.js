const express = require("express");
const controller = require("./chat.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticateRJ } = require("../../middleware/rjAuth.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const {
  otherUserIdParamSchema,
  messagesQuerySchema,
  conversationIdParamSchema,
  messageIdParamSchema,
} = require("./chat.validation");

function mount(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware); // must run before the routes below, not after

  router.get("/list", controller.listConversations);
  router.get(
    "/messages/:otherUserId",
    validate(otherUserIdParamSchema, "params"),
    validate(messagesQuerySchema, "query"),
    controller.getMessages
  );
  router.post(
    "/read/:conversationId",
    validate(conversationIdParamSchema, "params"),
    controller.markConversationRead
  );
  router.delete(
    "/messages/:messageId",
    validate(messageIdParamSchema, "params"),
    controller.deleteMessage
  );

  return router;
}

// Mounted at /user/chat
const userChatRouter = mount(authenticateUser);

// Mounted at /rj/chat
const rjChatRouter = mount(authenticateRJ);

module.exports = { userChatRouter, rjChatRouter };