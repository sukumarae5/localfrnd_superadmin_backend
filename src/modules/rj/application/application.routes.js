// src/modules/rj/application/application.routes.js
const express = require("express");
const controller = require("./application.controller");
const upload = require("../../../middleware/upload.middleware");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const { verifyWebhookSignature } = require("../../../middleware/webhookSignature.middleware");
const {
  listQuerySchema,
  submitApplicationSchema,
  addDocumentSchema,
  aiResultsSchema,
  decisionSchema,
  updatePrioritySchema,
} = require("./application.validation");

const router = express.Router();

// Webhook callback from AI/OCR provider — no admin auth, signature-verified instead.
router.post("/:appCode/ai-results", verifyWebhookSignature, validate(aiResultsSchema), controller.aiResults);

router.use(authenticate);

// GET /api/rj-applications?page=&limit=&search=&status=&priority=&categoryId=&kycStatus=&dateFrom=&dateTo=
router.get("/", validate(listQuerySchema, "query"), controller.list);

// GET /api/rj-applications/:appCode
router.get("/:appCode", controller.getOne);

// POST /api/rj-applications — submit a new application for an existing female User
router.post("/", validate(submitApplicationSchema), controller.submit);

// POST /api/rj-applications/:id/documents — upload a KYC doc
router.post("/:id/documents", upload.single("document"), validate(addDocumentSchema), controller.addDocument);

// PATCH /api/rj-applications/:id/decision  { status: approved|rejected, reason? }
router.patch(
  "/:id/decision",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(decisionSchema),
  controller.decide
);

// PATCH /api/rj-applications/:id/request-docs
router.patch(
  "/:id/request-docs",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.requestDocs
);

// PATCH /api/rj-applications/:id/interview
router.patch(
  "/:id/interview",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.scheduleInterview
);

// PATCH /api/rj-applications/:id/priority  { priority: low|medium|high }
router.patch(
  "/:id/priority",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updatePrioritySchema),
  controller.updatePriority
);

module.exports = router;