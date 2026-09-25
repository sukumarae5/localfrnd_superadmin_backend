// src/modules/rj/rings/rings.constants.js

// Fallback defaults if RJRingSetting row somehow doesn't exist yet — the
// service always tries to read the real row first via getOrCreateSetting().
const DEFAULT_CONVERSION_RATE = 1.0; // ₹ per ring
const DEFAULT_MIN_CONVERTIBLE_RINGS = 500;

const RING_TXN_TYPES = ["call_earning", "conversion", "admin_adjustment"];

function generateConversionCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CNV-${rand}`;
}

module.exports = {
  DEFAULT_CONVERSION_RATE,
  DEFAULT_MIN_CONVERTIBLE_RINGS,
  RING_TXN_TYPES,
  generateConversionCode,
};