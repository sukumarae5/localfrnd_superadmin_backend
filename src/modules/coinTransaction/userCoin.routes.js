const express =
  require("express");

const {
  authenticateUser
} = require(
  "../../middleware/Userauth.middleware"
);

const transactionController =
  require(
    "./coinTransaction.controller"
  );

const packageController =
  require(
    "../coinPackage/coinPackage.controller"
  );

const validate =
  require("../../middleware/validation.middleware");

const {
  initiatePurchaseSchema,
} = require("./coinTransaction.validation");

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/coin-packages",
  packageController.listActive
);

router.get(
  "/coins/balance",
  transactionController.getBalance
);

router.get(
  "/coins/transactions",
  transactionController.getMyTransactions
);

router.post(
  "/coins/purchase/initiate",
  validate(initiatePurchaseSchema),
  transactionController.initiatePurchase
);

module.exports = router;