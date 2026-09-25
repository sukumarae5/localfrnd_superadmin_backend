
const crypto = require("crypto");

const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");
const { prisma } = require("../config/database");
const { decryptSecret } = require("../utils/secretCipher.util");

async function verifyRazorpayWebhookSignature(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Missing X-Razorpay-Signature header"
      );
    }

    const config = await prisma.paymentGatewayConfig.findUnique({
      where: { gateway: "razorpay" },
    });

    if (!config || !config.webhookSecretEncrypted) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Razorpay webhook secret is not configured"
      );
    }

    const webhookSecret = decryptSecret(
      config.webhookSecretEncrypted
    );

    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Raw request body was not captured"
      );
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    console.log("========== RAZORPAY DEBUG ==========");
    console.log("Received signature:", signature);
    console.log("Expected signature:", expected);
    console.log("Raw body length:", rawBody.length);
    console.log("Raw body:", rawBody.toString("utf8"));
    console.log("====================================");

    const signatureBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    const isValid =
      signatureBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(signatureBuf, expectedBuf);

    if (!isValid) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid webhook signature"
      );
    }

    req.razorpayEventId =
      req.headers["x-razorpay-event-id"] || null;

    next();
  } catch (error) {
    next(
      error instanceof ApiError
        ? error
        : new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            "Webhook verification failed"
          )
    );
  }
}

module.exports = { verifyRazorpayWebhookSignature };
