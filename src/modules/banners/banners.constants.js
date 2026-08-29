const BANNER_TYPE = {
  PROMOTIONAL: "PROMOTIONAL",
  HOME: "HOME",
};

const BANNER_CATEGORY = {
  COIN_OFFER: "COIN_OFFER",
  PREMIUM: "PREMIUM",
  REFERRAL: "REFERRAL",
  SUBSCRIPTION: "SUBSCRIPTION",
  OTHER: "OTHER",
};

const BANNER_POSITION = {
  TOP_SLIDER: "TOP_SLIDER",
  MIDDLE_BANNER: "MIDDLE_BANNER",
  BOTTOM_BANNER: "BOTTOM_BANNER",
};

const BANNER_PLATFORM = {
  ANDROID: "ANDROID",
  IOS: "IOS",
  WEB: "WEB",
};

const BANNER_AUDIENCE = {
  ALL_USERS: "ALL_USERS",
  NEW_USERS: "NEW_USERS",
  EXISTING_USERS: "EXISTING_USERS",
  CUSTOM: "CUSTOM",
};

const BANNER_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
};

// Allowed manual status transitions (admin-triggered). Same status -> same
// status is always allowed by the service layer (idempotent no-op).
const BANNER_STATUS_TRANSITIONS = {
  DRAFT: ["SCHEDULED", "ACTIVE", "ARCHIVED"],
  SCHEDULED: ["ACTIVE", "PAUSED", "ARCHIVED"],
  ACTIVE: ["PAUSED", "EXPIRED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  EXPIRED: ["ARCHIVED"],
  ARCHIVED: [],
};

const BANNER_AUDIT_ACTION = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  ASSETS_APPROVED: "ASSETS_APPROVED",
  STATUS_CHANGED: "STATUS_CHANGED",
  SCHEDULED: "SCHEDULED",
  WENT_LIVE: "WENT_LIVE",
  PAUSED: "PAUSED",
  RESUMED: "RESUMED",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
  PRIORITY_CHANGED: "PRIORITY_CHANGED",
};

// priority 1-10 (1 = highest) bucketed into HIGH / MEDIUM / LOW badges,
// used by the Promotional Banner screen. Home Banner screen shows the raw
// numeric/star priority instead — same underlying field, two presentations.
const BANNER_PRIORITY_LABEL_BUCKETS = [
  { max: 2, label: "HIGH" },
  { max: 5, label: "MEDIUM" },
  { max: Infinity, label: "LOW" },
];

const BANNER_DEFAULT_DIMENSIONS = { width: 1080, height: 608, aspectRatio: "16:9" };

const BANNER_DISPLAY_CODE_PREFIX = "BN";

const BANNER_SORT_FIELDS = [
  "createdAt",
  "priority",
  "startAt",
  "endAt",
  "clicksCount",
  "impressionsCount",
];

module.exports = {
  BANNER_TYPE,
  BANNER_CATEGORY,
  BANNER_POSITION,
  BANNER_PLATFORM,
  BANNER_AUDIENCE,
  BANNER_STATUS,
  BANNER_STATUS_TRANSITIONS,
  BANNER_AUDIT_ACTION,
  BANNER_PRIORITY_LABEL_BUCKETS,
  BANNER_DEFAULT_DIMENSIONS,
  BANNER_DISPLAY_CODE_PREFIX,
  BANNER_SORT_FIELDS,
};