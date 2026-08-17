// src/modules/rj/review/review.routes.js
const express = require("express");
const controller = require("./review.controller");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const { listQuerySchema, submitReviewSchema, moderateSchema } = require("./review.validation");

const router = express.Router();

// Submitted by the male User's app post-call — swap `authenticate` for your
// user-auth middleware if this needs a different auth chain than the rest
// of this admin-facing router.
router.post("/", validate(submitReviewSchema), controller.submit);

router.use(authenticate);

// GET /api/rj-reviews?page=&limit=&search=&rating=&sentiment=&status=&dateFrom=&dateTo=
router.get("/", validate(listQuerySchema, "query"), controller.list);

// GET /api/rj-reviews/:id
router.get("/:id", controller.getOne);

// PATCH /api/rj-reviews/:id/moderate  { action: flag|remove|restore }
router.patch(
  "/:id/moderate",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(moderateSchema),
  controller.moderate
);

module.exports = router;