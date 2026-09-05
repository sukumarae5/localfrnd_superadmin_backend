const express = require("express");

const controller = require("./paymentLogs.controller");
const validate = require("../../middleware/validation.middleware");

const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");

const { listLogsSchema } = require("./paymentLogs.validation");

const router = express.Router();

router.use(authenticate);
router.use(requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

router.get("/dashboard", controller.dashboard);
router.get("/", validate(listLogsSchema, "query"), controller.list);
router.get("/:id", controller.getOne);

module.exports = router;
