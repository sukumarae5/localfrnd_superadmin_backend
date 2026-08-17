// src/modules/rj/status/status.constants.js

const RJ_STATUSES = ["online", "offline", "busy", "on_call"];
const OFFLINE_REASONS = ["scheduled_break", "logged_out", "unexpected"];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

module.exports = {
  RJ_STATUSES,
  OFFLINE_REASONS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};