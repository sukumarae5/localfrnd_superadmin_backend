const express =
  require("express");

const controller =
  require("./coinTransaction.controller");

const validate =
  require("../../middleware/validation.middleware");

const {
  authenticate,
  requireRole,
} = require("../../middleware/auth.middleware");

const {
  ADMIN_ROLES,
} = require("../../constants");

const {
  listCoinTransactionsSchema,
} = require(
  "./coinTransaction.validation"
);

const router = express.Router();

router.use(authenticate);

/*
Admin transaction history
*/

router.get(
  "/",
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  ),
  validate(
    listCoinTransactionsSchema,
    "query"
  ),
  controller.list
);

module.exports = router;