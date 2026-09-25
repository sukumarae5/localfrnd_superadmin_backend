const Joi = require("joi");
const express = require("express");
const controller = require("./calls.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { authenticateRJ } = require("../../middleware/rjAuth.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  startCallSchema, endCallSchema, sessionRefSchema, availableRJsQuerySchema, listCallsQuerySchema,
  historyQuerySchema, counterpartUserIdParamSchema,
} = require("./calls.validation");

// Mounted at /rj/calls
const rjCallsRouter = express.Router();
rjCallsRouter.use(authenticateRJ);
rjCallsRouter.post("/search", validate(startCallSchema), controller.rjStartSearch);
rjCallsRouter.post("/search/cancel", controller.rjCancelSearch);
rjCallsRouter.get("/active", controller.rjActiveCall);
rjCallsRouter.post("/accept", validate(sessionRefSchema), controller.rjAcceptDirectCall);
rjCallsRouter.post("/reject", validate(sessionRefSchema), controller.rjRejectDirectCall);
rjCallsRouter.post("/end", validate(endCallSchema), controller.endCall);
rjCallsRouter.get("/history", validate(historyQuerySchema, "query"), controller.rjCallHistory);
rjCallsRouter.get("/recent-contacts", controller.rjRecentContacts);
rjCallsRouter.get(
  "/history/:counterpartUserId",
  validate(counterpartUserIdParamSchema, "params"),
  validate(historyQuerySchema, "query"),
  controller.rjHistoryWithContact
);

// Mounted at /user/calls
const userCallsRouter = express.Router();
userCallsRouter.use(authenticateUser);
userCallsRouter.get("/available-rjs", validate(availableRJsQuerySchema, "query"), controller.listAvailableRJs);
userCallsRouter.post("/random", validate(startCallSchema), controller.userStartRandomCall);
userCallsRouter.post("/random/cancel", controller.userCancelSearch);
userCallsRouter.post("/local", validate(startCallSchema), controller.userStartLocalCall);

const rjIdParamSchema = Joi.object({ rjId: Joi.number().integer().positive().required() });
userCallsRouter.post("/direct/:rjId", validate(rjIdParamSchema, "params"), validate(startCallSchema), controller.userStartDirectCall);
userCallsRouter.post("/ringing/cancel", validate(sessionRefSchema), controller.userCancelRinging);
userCallsRouter.get("/active", controller.userActiveCall);
userCallsRouter.post("/end", validate(endCallSchema), controller.endCall);
userCallsRouter.get("/history", validate(historyQuerySchema, "query"), controller.userCallHistory);
userCallsRouter.get("/recent-contacts", controller.userRecentContacts);
userCallsRouter.get(
  "/history/:counterpartUserId",
  validate(counterpartUserIdParamSchema, "params"),
  validate(historyQuerySchema, "query"),
  controller.userHistoryWithContact
);

// Mounted at /admin/calls
const adminCallsRouter = express.Router();
adminCallsRouter.use(authenticate);
adminCallsRouter.get("/", validate(listCallsQuerySchema, "query"), controller.adminListCalls);
adminCallsRouter.get("/:sessionPublicId", controller.adminGetCallDetail);
adminCallsRouter.post(
  "/:sessionPublicId/force-end",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.adminForceEndCall
);

module.exports = { rjCallsRouter, userCallsRouter, adminCallsRouter };