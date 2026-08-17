const express = require("express");
const router = express.Router();

const controller = require("./interestCategory.controller");
const validation = require("./interestCategory.validation");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");

router.use(authenticate, requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

router.get("/stats", controller.getStats);
router.get("/", validate(validation.listQuerySchema, "query"), controller.getCategories);
router.get("/:publicId", validate(validation.publicIdParamSchema, "params"), controller.getCategoryById);
router.post("/", validate(validation.createSchema, "body"), controller.createCategory);
router.patch(
  "/:publicId",
  validate(validation.publicIdParamSchema, "params"),
  validate(validation.updateSchema, "body"),
  controller.updateCategory
);
router.delete("/:publicId", validate(validation.publicIdParamSchema, "params"), controller.deleteCategory);

module.exports = router;