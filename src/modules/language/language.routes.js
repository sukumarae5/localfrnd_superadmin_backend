const express = require("express");
const controller = require("./language.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const {
  createLanguageSchema,
  updateLanguageSchema,
  updateStatusSchema,
} = require("./language.validation");

const router = express.Router();

router.use(authenticate);

// GET /api/languages — any logged-in admin (used to populate dropdowns / this table)
router.get("/", controller.list);
router.get("/:id", controller.getOne);

// Managing the language list itself is a system-level setting — super_admin / admin only
router.post("/", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), validate(createLanguageSchema), controller.create);
router.put("/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), validate(updateLanguageSchema), controller.update);
router.patch(
  "/:id/status",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateStatusSchema),
  controller.updateStatus
);
router.delete("/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), controller.remove);

module.exports = router;
