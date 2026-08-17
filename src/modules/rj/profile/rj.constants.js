// src/modules/rj/profile/rj.constants.js

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const RJ_STATUSES = ["online", "offline", "busy", "on_call"];
const RJ_TIERS = ["silver", "gold", "platinum"];
const VERIFICATION_STATUSES = ["unverified", "pending", "verified"];

// RJ account state (distinct from RJStatus which is real-time presence).
// Reuses the same active/inactive/suspended/blocked vocabulary as User so
// the same moderation UX pattern applies to RJs.
const RJ_ACCOUNT_STATUSES = ["active", "inactive", "suspended", "blocked"];

// An RJ is "online" (real-time presence) if she pinged recently — same
// pattern as ONLINE_THRESHOLD_MINUTES in users.constants.js.
const ONLINE_THRESHOLD_MINUTES = 5;

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  RJ_STATUSES,
  RJ_TIERS,
  VERIFICATION_STATUSES,
  RJ_ACCOUNT_STATUSES,
  ONLINE_THRESHOLD_MINUTES,
};