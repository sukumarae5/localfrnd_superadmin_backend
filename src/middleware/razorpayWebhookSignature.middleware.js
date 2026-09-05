
const crypto = require("crypto");

const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");
const { prisma } = require("../config/database");
const { decryptSecret } = require("../utils/secretCipher.util");

async function verifyRazorpayWebhookSignature(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Missing X-Razorpay-Signature header");
    }

    const config = await prisma.paymentGatewayConfig.findUnique({
      where: { gateway: "razorpay" },
    });

    if (!config || !config.webhookSecretEncrypted) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Razorpay webhook secret is not configured");
    }

    const webhookSecret = decryptSecret(config.webhookSecretEncrypted);

    // Hash the exact raw bytes received (captured by express.json's verify
    // callback in app.js), not JSON.stringify(req.body) -- re-serializing
    // the parsed object can produce different whitespace than what
    // Razorpay actually signed, causing correct signatures to be rejected.
    // Same principle as the existing KYC webhook middleware.
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    const signatureBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    const isValid =
      signatureBuf.length === expectedBuf.length && crypto.timingSafeEqual(signatureBuf, expectedBuf);

    if (!isValid) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid webhook signature");
    }

    req.razorpayEventId = req.headers["x-razorpay-event-id"] || null;

    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(HTTP_STATUS.UNAUTHORIZED, "Webhook verification failed"));
  }
}

module.exports = { verifyRazorpayWebhookSignature };
