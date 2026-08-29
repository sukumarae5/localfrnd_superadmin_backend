// src/modules/userAvatar/userAvatar.routes.js
const express = require("express");
const controller = require("./userAvatar.controller");
const uploadMemory = require("../../middleware/avatarUpload.middleware");
const validate = require("../../middleware/validation.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { listUserAvatarsQuerySchema, selectAvatarSchema } = require("./userAvatar.validation");

const router = express.Router();
router.use(authenticateUser);

router.get("/avatars", validate(listUserAvatarsQuerySchema, "query"), controller.listAvatars);
router.post("/profile/avatar/select", validate(selectAvatarSchema), controller.selectAvatar);
router.post("/profile/avatar/upload", uploadMemory.single("avatar"), controller.uploadAvatar);
router.delete("/profile/avatar", controller.removeAvatar);

module.exports = router;