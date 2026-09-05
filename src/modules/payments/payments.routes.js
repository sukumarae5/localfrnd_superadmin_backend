const express = require("express");

const controller = require("./payments.controller");
const validate = require("../../middleware/validation.middleware");

const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");

const { listPaymentsSchema } = require("./payments.validation");

const router = express.Router();

router.use(authenticate);
router.use(requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT));

// Must come before /:idOrCode so "dashboard" isn't swallowed as an id/code.
router.get("/dashboard", controller.dashboard);

router.get("/", validate(listPaymentsSchema, "query"), controller.list);
router.get("/:idOrCode", controller.getOne);

module.exports = router;
