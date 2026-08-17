// src/modules/rj/application/application.constants.js
const crypto = require("crypto");

const APPLICATION_STATUSES = ["pending", "under_review", "interview_pending", "approved", "rejected"];
const PRIORITIES = ["low", "medium", "high"];
const DOC_TYPES = ["aadhaar", "pan", "biometric", "bank", "email", "mobile"];
const DOC_VERIFICATION_METHODS = ["ai", "manual"];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function generateAppCode() {
  return `APP-${crypto.randomInt(1000, 9999)}`;
}

// Priority is auto-derived from the AI suitability score at submission time,
// admins can still override it later via updatePriority.
function priorityFromScore(score) {
  if (score === null || score === undefined) return "medium";
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

module.exports = {
  APPLICATION_STATUSES,
  PRIORITIES,
  DOC_TYPES,
  DOC_VERIFICATION_METHODS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  generateAppCode,
  priorityFromScore,
};