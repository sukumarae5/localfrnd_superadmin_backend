// src/modules/faq/faq.routes.js
// Mounted at /api/admin/faqs — mirrors lifestyle.routes.js exactly.
const express = require("express");
const router = express.Router();

const controller = require("./faq.controller");
const validation = require("./faq.validation");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");

router.use(authenticate, requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

router.get("/", validate(validation.listQuerySchema, "query"), controller.getFaqs);
router.get("/:publicId", validate(validation.publicIdParamSchema, "params"), controller.getFaq);
router.post("/", validate(validation.createSchema, "body"), controller.createFaq);
router.put(
  "/:publicId",
  validate(validation.publicIdParamSchema, "params"),
  validate(validation.updateSchema, "body"),
  controller.updateFaq
);
router.delete("/:publicId", validate(validation.publicIdParamSchema, "params"), controller.deleteFaq);

module.exports = router;