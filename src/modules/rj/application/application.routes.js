// src/modules/rj/application/application.routes.js
const express = require("express");
const controller = require("./application.controller");
const upload = require("../../../middleware/upload.middleware");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { authenticateUser } = require("../../../middleware/Userauth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const { verifyWebhookSignature } = require("../../../middleware/webhookSignature.middleware");
const {
  listQuerySchema,
  submitApplicationSchema,
  applySelfSchema,
  addDocumentSchema,
  aiResultsSchema,
  decisionSchema,
  updatePrioritySchema,
} = require("./application.validation");

// ============================================================================
// Mounted at /api/rj-applications — admin/superadmin panel
// ============================================================================
const adminApplicationRouter = express.Router();

// Webhook callback from AI/OCR provider — no admin auth, signature-verified instead.
adminApplicationRouter.post(
  "/:appCode/ai-results",
  verifyWebhookSignature,
  validate(aiResultsSchema),
  controller.aiResults
);

adminApplicationRouter.use(authenticate);

// GET /api/rj-applications?page=&limit=&search=&status=&priority=&categoryId=&kycStatus=&dateFrom=&dateTo=
adminApplicationRouter.get("/", validate(listQuerySchema, "query"), controller.list);

// GET /api/rj-applications/:appCode
adminApplicationRouter.get("/:appCode", controller.getOne);

// POST /api/rj-applications — admin submits/backfills an application on behalf of a female User
adminApplicationRouter.post("/", validate(submitApplicationSchema), controller.submit);

// POST /api/rj-applications/:id/documents — upload a KYC doc
adminApplicationRouter.post(
  "/:id/documents",
  upload.single("document"),
  validate(addDocumentSchema),
  controller.addDocument
);

// PATCH /api/rj-applications/:id/decision  { status: approved|rejected, reason? }
adminApplicationRouter.patch(
  "/:id/decision",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(decisionSchema),
  controller.decide
);

// PATCH /api/rj-applications/:id/request-docs
adminApplicationRouter.patch(
  "/:id/request-docs",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.requestDocs
);

// PATCH /api/rj-applications/:id/interview
adminApplicationRouter.patch(
  "/:id/interview",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.scheduleInterview
);

// PATCH /api/rj-applications/:id/priority  { priority: low|medium|high }
adminApplicationRouter.patch(
  "/:id/priority",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updatePrioritySchema),
  controller.updatePriority
);

// ============================================================================
// Mounted at /api/user/rj-applications — mobile app, female User self-apply
// ============================================================================
const userApplicationRouter = express.Router();
userApplicationRouter.use(authenticateUser);

// POST /api/user/rj-applications — the logged-in User applies for herself.
// userId is taken from req.user.id (the JWT), never from the body.
userApplicationRouter.post("/", validate(applySelfSchema), controller.submitSelf);

// GET /api/user/rj-applications/me — check her own application status
userApplicationRouter.get("/me", controller.getOwn);

module.exports = { adminApplicationRouter, userApplicationRouter };