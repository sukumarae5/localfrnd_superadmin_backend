// src/middleware/webhook.middleware.js
const crypto = require("crypto");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

// Verifies the webhook came from your KYC provider using an HMAC signature
// header. Adjust header name / algorithm to match your provider's docs.
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers["x-webhook-signature"];
  const secret = process.env.KYC_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Missing webhook signature"));
  }

  // Hash the exact raw bytes received (captured by express.json's verify
  // callback in app.js), not JSON.stringify(req.body) — re-serializing the
  // parsed object can produce different whitespace than the sender actually
  // signed, causing correct signatures to be rejected.
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid webhook signature"));
  }

  next();
}

module.exports = { verifyWebhookSignature };