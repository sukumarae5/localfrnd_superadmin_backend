// src/modules/users/users.constants.js

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const USER_STATUSES = ["active", "inactive", "suspended", "blocked"];
const VERIFICATION_STATUSES = ["unverified", "pending", "verified"];
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];

// A user is considered "online" if they had activity within this many minutes.
// This is a simple, no-new-infra way to back an "Online Now" stat using the
// lastActiveAt column you already have. See the note in users.service.js for
// the more accurate (Socket.io + Redis) alternative if you want it later.
const ONLINE_THRESHOLD_MINUTES = 5;

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  USER_STATUSES,
  VERIFICATION_STATUSES,
  GENDERS,
  ONLINE_THRESHOLD_MINUTES,
};