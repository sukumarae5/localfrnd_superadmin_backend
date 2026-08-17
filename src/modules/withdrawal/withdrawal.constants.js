const WITHDRAWAL_STATUSES = ["pending", "approved", "processing", "success", "rejected", "failed"];
const REJECTION_CODES = ["FRAUD_DETECTED", "KYC_FAILED", "BANK_VERIFICATION_FAILED", "DUPLICATE_REQUEST", "OTHER"];

module.exports = { WITHDRAWAL_STATUSES, REJECTION_CODES };