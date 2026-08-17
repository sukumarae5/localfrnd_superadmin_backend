const crypto = require("crypto");

const FEEDBACK_TYPES = ["bug", "feature", "complaint", "general"];
const FEEDBACK_STATUSES = ["open", "in_progress", "resolved", "closed"];
const FEEDBACK_PRIORITIES = ["low", "medium", "high"];

function generateTicketCode() {
  return `FB-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

module.exports = { FEEDBACK_TYPES, FEEDBACK_STATUSES, FEEDBACK_PRIORITIES, generateTicketCode };