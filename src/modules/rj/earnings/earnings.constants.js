// src/modules/rj/earnings/earnings.constants.js

const RJ_WALLET_TXN_TYPES = ["call_earning", "bonus", "referral", "commission", "withdrawal"];
const PAYMENT_METHODS = ["upi", "credit_card", "wallet", "other"];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

module.exports = {
  RJ_WALLET_TXN_TYPES,
  PAYMENT_METHODS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};