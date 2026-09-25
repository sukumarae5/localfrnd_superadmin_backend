// src/modules/rj/rings/rings.routes.js
const express = require("express");
const controller = require("./rings.controller");
const validate = require("../../../middleware/validation.middleware");
const { authenticateRJ } = require("../../../middleware/rjAuth.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const { listQuerySchema, convertRingsSchema, updateSettingSchema } = require("./rings.validation");

// ============================================================================
// Mounted at /api/rj/rings — mobile app, RJ's own rings + conversion
// ============================================================================
const rjRingsRouter = express.Router();
rjRingsRouter.use(authenticateRJ);

// GET /api/rj/rings/me — balance, current rate/threshold, recent conversions
rjRingsRouter.get("/me", controller.getMySummary);

// GET /api/rj/rings/history?page=&limit=&type=
rjRingsRouter.get("/history", validate(listQuerySchema, "query"), controller.listMyHistory);

// POST /api/rj/rings/convert  { rings: 500 }
rjRingsRouter.post("/convert", validate(convertRingsSchema), controller.convert);

// ============================================================================
// Mounted at /api/admin/rj-ring-settings — admin panel
// ============================================================================
const adminRingSettingsRouter = express.Router();
adminRingSettingsRouter.use(authenticate);

// GET /api/admin/rj-ring-settings
adminRingSettingsRouter.get("/", controller.getSettings);

// PUT /api/admin/rj-ring-settings  { conversionRate?, minConvertibleRings? }
adminRingSettingsRouter.put(
  "/",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(updateSettingSchema),
  controller.updateSettings
);

module.exports = { rjRingsRouter, adminRingSettingsRouter };