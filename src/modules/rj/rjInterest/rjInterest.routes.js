const express = require("express");
const router = express.Router();

const controller = require("./rjInterest.controller");
const validation = require("./rjInterest.validation");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { authenticateUser } = require("../../../middleware/Userauth.middleware"); // confirm filename
const { authenticateRJ } = require("../../../middleware/rjAuth.middleware");
const { ADMIN_ROLES } = require("../../../constants");

// Admin: manage RJ <-> Interest assignments
router.post(
  "/admin/assign",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(validation.assignSchema, "body"),
  controller.assign
);
router.delete(
  "/admin/:rjId/:categoryPublicId",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(validation.rjIdParamSchema, "params"),
  controller.unassign
);
router.get(
  "/admin/category/:categoryPublicId",
  authenticate,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(validation.categoryParamSchema, "params"),
  validate(validation.listQuerySchema, "query"),
  controller.getRjsForCategory
);

// RJ self-service — note: rjAuth.middleware expects req.params.id to match her own RJ id
// for status-style routes; this route has no :id param, so that check is skipped safely.
router.put("/rj/me", authenticateRJ, validate(validation.selfSelectSchema, "body"), controller.setMine);

// User-facing: recommendations
router.get(
  "/recommendations",
  authenticateUser,
  validate(validation.recommendationsQuerySchema, "query"),
  controller.getRecommendations
);

module.exports = router;