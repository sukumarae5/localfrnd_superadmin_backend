const express = require("express");
const router = express.Router();

const controller = require("./userProfile.controller");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const validate = require("../../middleware/validation.middleware");
// Reusing the SAME schema as admin's profile edits — it already excludes
// mobile number/status/verificationStatus, which is exactly right for
// self-service too (a user can't verify or suspend themselves).
const { updateUserSchema } = require("../users/users.validation");

router.use(authenticateUser);

// GET /api/user/me
router.get("/", controller.getMe);

// PUT /api/user/me — same field set as admin's profile edit, applied to self
router.put("/", validate(updateUserSchema), controller.updateMe);

// DELETE /api/user/me — self-service account deletion (soft delete via deletedAt)
router.delete("/", controller.deleteMe);

module.exports = router;