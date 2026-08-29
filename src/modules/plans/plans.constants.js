const PLAN_SORT_FIELDS = [
  "priceCents",
  "priceAfterDiscount",
  "displayName",
  "displayPriority",
  "purchasesCount",
  "revenueTotal",
  "createdAt",
];

const PLAN_TYPE = {
  NORMAL: "normal",
  PREMIUM: "premium",
};

const PLAN_DISPLAY_CODE_PREFIX = "RF";

const PLAN_AUDIT_ACTION = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  PRICE_UPDATED: "PRICE_UPDATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  PUBLISHED: "PUBLISHED",
  DRAFT_SAVED: "DRAFT_SAVED",
  DUPLICATED: "DUPLICATED",
  DELETED: "DELETED",
  PURCHASED: "PURCHASED",
  REFUNDED: "REFUNDED",
};

// Fields whose change is worth calling out explicitly in an audit log entry
// (e.g. "Price updated by Admin") rather than a generic "Plan updated".
const PLAN_PRICE_FIELDS = ["originalPrice", "discountPercent"];

module.exports = {
  PLAN_SORT_FIELDS,
  PLAN_TYPE,
  PLAN_DISPLAY_CODE_PREFIX,
  PLAN_AUDIT_ACTION,
  PLAN_PRICE_FIELDS,
};