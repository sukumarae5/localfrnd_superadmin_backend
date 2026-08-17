// src/modules/rj/performance/performance.routes.js
const express = require("express");
const controller = require("./performance.controller");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const { listQuerySchema } = require("./performance.validation");

const router = express.Router();
router.use(authenticate);

// GET /api/rj-performance?page=&limit=&search=&categoryId=&sortBy=&sortOrder=
router.get("/", validate(listQuerySchema, "query"), controller.list);

// GET /api/rj-performance/:rjId/deep-dive
router.get("/:rjId/deep-dive", controller.deepDive);

// POST /api/rj-performance/:rjId/recompute — manual snapshot refresh
router.post("/:rjId/recompute", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), controller.recompute);

module.exports = router;