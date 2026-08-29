const COIN_TRANSACTION_TYPES = {
  PURCHASE: "purchase",
  ADMIN_CREDIT: "admin_credit",
  ADMIN_DEBIT: "admin_debit",
  REFUND: "refund",
  USAGE: "usage",
};

const COIN_TRANSACTION_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const MAX_PAGE_SIZE = 100;

module.exports = {
  COIN_TRANSACTION_TYPES,
  COIN_TRANSACTION_STATUS,
  MAX_PAGE_SIZE,
};