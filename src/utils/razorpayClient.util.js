// src/utils/razorpayClient.util.js
//
// Thin wrapper over Razorpay's Orders API. NOTE on credential mapping:
// Razorpay's Orders API auth is HTTP Basic with (Key ID : Key Secret) --
// this project's PaymentGatewayConfig.merchantId is used to hold the
// Key ID, and apiKeyEncrypted holds the encrypted Key Secret. This is a
// deliberate simplification (real "Merchant ID" and "Key ID" are
// technically distinct in Razorpay's dashboard) so we don't need another
// schema column for a single-gateway MVP. Revisit if PhonePe/Cashfree
// need genuinely different credential shapes.

const axios = require("axios");

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

/*
Creates a Razorpay order. amount must be in the smallest currency unit
(paise for INR) per Razorpay's API contract -- caller is responsible for
the *100 conversion, this util does not do it implicitly to avoid
silent double-conversion bugs.
*/
async function createOrder({ keyId, keySecret, amountInPaise, currency, receipt, notes }) {
  const response = await axios.post(
    `${RAZORPAY_API_BASE}/orders`,
    {
      amount: amountInPaise,
      currency: currency || "INR",
      receipt,
      notes: notes || {},
    },
    {
      auth: { username: keyId, password: keySecret },
      headers: { "Content-Type": "application/json" },
    }
  );

  return response.data; // { id, entity, amount, amount_paid, amount_due, currency, receipt, status, attempts, notes, created_at }
}

module.exports = { createOrder };
