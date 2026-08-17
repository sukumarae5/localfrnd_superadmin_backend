// src/modules/rj/earnings/earnings.routes.js
const express = require("express");
const controller = require("./earnings.controller");
const validate = require("../../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../../constants");
const {
  listEarningsQuerySchema,
  listTxnsQuerySchema,
  payoutSchema,
  bonusSchema,
  commissionSchema,
  statementQuerySchema,
} = require("./earnings.validation");

const router = express.Router();
router.use(authenticate);

// GET /api/rj-earnings?page=&limit=&search=&tier=&status= — includes stat cards
router.get("/", validate(listEarningsQuerySchema, "query"), controller.list);

// GET /api/rj-earnings/:rjId — breakdown, daily trend, source mix, payout history
router.get("/:rjId", controller.getOne);

// GET /api/rj-earnings/:rjId/transactions?page=&limit=&type=
router.get("/:rjId/transactions", validate(listTxnsQuerySchema, "query"), controller.transactions);

// GET /api/rj-earnings/:rjId/statement?dateFrom=&dateTo=
router.get("/:rjId/statement", validate(statementQuerySchema, "query"), controller.statement);

router.post("/:rjId/payout", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), validate(payoutSchema), controller.payout);
router.post("/:rjId/bonus", requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), validate(bonusSchema), controller.bonus);
router.patch("/:rjId/commission", requireRole(ADMIN_ROLES.SUPER_ADMIN), validate(commissionSchema), controller.commission);

module.exports = router;