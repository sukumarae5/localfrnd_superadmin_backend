// src/modules/avatar/avatar.routes.js
const express = require("express");
const controller = require("./avatar.controller");
const uploadMemory = require("../../middleware/avatarUpload.middleware");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const { listAvatarsQuerySchema, createAvatarSchema, updateAvatarSchema } = require("./avatar.validation");

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listAvatarsQuerySchema, "query"), controller.list);
router.get("/:id", controller.getOne);

router.post(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  uploadMemory.single("image"),
  validate(createAvatarSchema),
  controller.create
);
router.put(
  "/:id",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  uploadMemory.single("image"),
  validate(updateAvatarSchema),
  controller.update
);
router.delete("/:id", requireRole(ADMIN_ROLES.SUPER_ADMIN), controller.remove);

module.exports = router;