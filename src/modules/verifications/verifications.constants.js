const DOC_TYPES = ["aadhaar", "passport", "driving_license", "voter_id"];
const REQUEST_STATUSES = ["pending_review", "approved", "rejected", "expired"];
const RISK_LEVELS = ["low", "medium", "high"];

function riskLevelFromScore(score) {
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

module.exports = { DOC_TYPES, REQUEST_STATUSES, RISK_LEVELS, riskLevelFromScore };