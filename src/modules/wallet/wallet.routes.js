const express = require("express");

const controller = require("./wallet.controller");

const validate = require("../../middleware/validation.middleware");

const {
  authenticate,
  requireRole,
} = require("../../middleware/auth.middleware");

const {
  authenticateUser,
} = require("../../middleware/Userauth.middleware");

const { ADMIN_ROLES } = require("../../constants");

const {
  listWalletsQuerySchema,
  creditDebitSchema,
  freezeSchema,
  listTxnsQuerySchema,
} = require("./wallet.validation");

const router = express.Router();




router.post(
  "/create",
  authenticateUser,
  controller.createMyWallet
);
router.use(authenticate);

router.get(
  "/",
  validate(listWalletsQuerySchema, "query"),
  controller.list
);
router.get(
  "/:userId/transactions",
  validate(listTxnsQuerySchema, "query"),
  controller.transactions
);
router.post(
  "/:userId/credit",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(creditDebitSchema),
  controller.credit
);
router.post(
  "/:userId/debit",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(creditDebitSchema),
  controller.debit
);
router.patch(
  "/:userId/freeze",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN
  ),
  validate(freezeSchema),
  controller.freeze
);
router.get(
  "/:userId",
  controller.getOne
);


module.exports = router;