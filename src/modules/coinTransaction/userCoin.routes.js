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

module.exports = router;