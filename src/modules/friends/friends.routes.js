const express = require("express");
const controller = require("./friends.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticateRJ } = require("../../middleware/rjAuth.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const {
  sendRequestSchema,
  requestPublicIdSchema,
  otherUserIdParamSchema,
  unfriendSchema,
} = require("./friends.validation");

function mount(authMiddleware) {
  const router = express.Router();
  router.use(authMiddleware); // must run before the routes below, not after

  router.post("/request", validate(sendRequestSchema), controller.sendRequest);
  router.post("/accept", validate(requestPublicIdSchema), controller.acceptRequest);
  router.post("/reject", validate(requestPublicIdSchema), controller.rejectRequest);
  router.post("/cancel", validate(requestPublicIdSchema), controller.cancelRequest);
  router.get("/", controller.listFriends);
  router.get("/pending", controller.listPendingReceived);
  router.get("/pending/sent", controller.listPendingSent);
  router.get("/status/:otherUserId", validate(otherUserIdParamSchema, "params"), controller.getStatus);
  router.post("/unfriend", validate(unfriendSchema), controller.unfriend);

  return router;
}

// Mounted at /user/friends
const userFriendsRouter = mount(authenticateUser);

// Mounted at /rj/friends
const rjFriendsRouter = mount(authenticateRJ);

module.exports = { userFriendsRouter, rjFriendsRouter };