// src/modules/calls/calls.constants.js

const CALL_TYPES = ["audio", "video"];
const CALL_MODES = ["random", "direct", "local"];

const CALL_RATES = {
  audio: 10,
  video: 60,
};

const RJ_EARN_RATE_PER_MINUTE = 10;
const BILLING_INTERVAL_MS = 60 * 1000;

// How long a direct/local call rings before it's marked missed.
const DIRECT_CALL_RING_TIMEOUT_MS = Number(process.env.DIRECT_CALL_RING_TIMEOUT_MS) || 30 * 1000;

// Local Call fallback chain — city first, then optionally widen. Configure
// via env; comma-separated, most-specific first. Never silently falls back
// beyond what's listed here (see calls.service.js#startLocalCall).
const LOCAL_MATCH_LEVELS = (process.env.LOCAL_MATCH_LEVEL || "city").split(",").map((s) => s.trim());

const REDIS_KEYS = {
  rjQueue: (type) => `call:queue:rj:${type}`,
  userQueue: (type) => `call:queue:user:${type}`,
  rjSearching: (rjId) => `call:searching:rj:${rjId}`,
  userSearching: (userId) => `call:searching:user:${userId}`,
};

const SEARCH_TTL_SECONDS = 120;

const END_REASONS = {
  USER_HANGUP: "user_hangup",
  RJ_HANGUP: "rj_hangup",
  INSUFFICIENT_COINS: "insufficient_coins",
  DISCONNECTED: "disconnected",
  ADMIN_FORCE_END: "admin_force_end",
  RJ_REJECTED: "rj_rejected",
  CALLER_CANCELLED: "caller_cancelled",
  RING_TIMEOUT: "ring_timeout",
};

const CALL_ERRORS = {
  INSUFFICIENT_COINS: "INSUFFICIENT_COINS",
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  WALLET_FROZEN: "WALLET_FROZEN",
  ALREADY_SEARCHING: "ALREADY_SEARCHING",
  ALREADY_ON_CALL: "ALREADY_ON_CALL",
  NOT_SEARCHING: "NOT_SEARCHING",
  NO_RJ_AVAILABLE: "NO_RJ_AVAILABLE",
  NO_LOCAL_MATCH: "NO_LOCAL_MATCH",
  RJ_NOT_AVAILABLE: "RJ_NOT_AVAILABLE",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_NOT_ONGOING: "SESSION_NOT_ONGOING",
  SESSION_NOT_RINGING: "SESSION_NOT_RINGING",
  NOT_A_PARTICIPANT: "NOT_A_PARTICIPANT",
};

module.exports = {
  CALL_TYPES, CALL_MODES, CALL_RATES, RJ_EARN_RATE_PER_MINUTE, BILLING_INTERVAL_MS,
  DIRECT_CALL_RING_TIMEOUT_MS, LOCAL_MATCH_LEVELS, REDIS_KEYS, SEARCH_TTL_SECONDS,
  END_REASONS, CALL_ERRORS,
};