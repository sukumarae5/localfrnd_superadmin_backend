// verifications.routes.js
const express = require("express");
const controller = require("./verifications.controller");
const upload = require("../../middleware/avatarUpload.middleware");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const { listQuerySchema, decisionSchema, flagSchema, submitSchema, aiResultsSchema } = require("./verifications.validation");
const { verifyWebhookSignature } = require("../../middleware/webhookSignature.middleware");

const router = express.Router();

// AI/OCR provider webhook — signature-verified, no user/admin auth.
router.post("/:requestCode/ai-results", verifyWebhookSignature, validate(aiResultsSchema), controller.aiResults);

// The app user submitting their own KYC — user-auth, not admin-auth.
router.post(
  "/",
  authenticateUser,
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
  ]),
  validate(submitSchema),
  controller.submit
);

router.use(authenticate);

// GET /api/verifications?page=&limit=&status=&docType=&dateFrom=&dateTo=
router.get("/", validate(listQuerySchema, "query"), controller.list);
router.get("/:requestCode", controller.getOne);

router.patch(
  "/:id/decision",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(decisionSchema),
  controller.decide
);
router.patch(
  "/:id/flag",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(flagSchema),
  controller.flag
);

module.exports = router;