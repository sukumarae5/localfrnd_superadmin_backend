const PAYMENT_TYPES = ["coin_purchase", "subscription", "rj_tip"];
const PAYMENT_GATEWAYS = ["razorpay", "phonepe", "cashfree", "paytm"];
const PAYMENT_STATUSES = ["initiated", "authorized", "success", "failed", "refunded"];
const PAYMENT_METHODS = ["upi", "credit_card", "wallet", "other"];

const MAX_PAGE_SIZE = 100;

module.exports = {
  PAYMENT_TYPES,
  PAYMENT_GATEWAYS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  MAX_PAGE_SIZE,
};
