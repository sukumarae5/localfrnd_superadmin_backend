const paymentsService = require("../payments/payments.service");
const paymentLogsService = require("../paymentLogs/paymentLogs.service");
const coinTransactionService = require("../coinTransaction/coinTransaction.service");
const { prisma } = require("../../config/database");

// Razorpay payment methods -> this project's PaymentMethod enum
// (upi | credit_card | wallet | other).
function mapPaymentMethod(razorpayMethod) {
  if (razorpayMethod === "upi") return "upi";
  if (razorpayMethod === "card") return "credit_card";
  if (razorpayMethod === "wallet") return "wallet";
  return "other";
}

async function isDuplicateEvent(eventId) {
  if (!eventId) return false; // no event id header -- can't dedupe, process it

  const existing = await prisma.paymentWebhookLog.findFirst({
    where: { traceId: eventId, gateway: "razorpay" },
  });

  return !!existing;
}

/*
Entry point called by the controller after signature verification has
already passed. Always logs the raw payload first (even for events we
end up ignoring), then dispatches based on event type.

Deliberately does NOT throw on business-logic failures after logging --
Razorpay will retry a webhook that receives a non-2xx response, and
retrying something we've already recorded (but failed to fully process)
just produces duplicate log noise. Failures are logged at level "error"
for manual reconciliation instead.
*/
async function handleRazorpayEvent({ payload, eventId, requestId, endpoint }) {
  const eventType = payload?.event || "unknown";

  if (await isDuplicateEvent(eventId)) {
    await paymentLogsService.recordEvent({
      traceId: eventId,
      requestId,
      endpoint,
      gateway: "razorpay",
      eventType: `${eventType}.duplicate_ignored`,
      level: "info",
      rawPayload: payload,
      paymentId: null,
    });
    return { status: "duplicate_ignored" };
  }

  const paymentEntity = payload?.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;

  const matchedPayment = orderId ? await paymentsService.findByOrderId(orderId) : null;

  // Always log first, regardless of what happens next.
  const log = await paymentLogsService.recordEvent({
    traceId: eventId || `no-event-id-${Date.now()}`,
    requestId,
    endpoint,
    gateway: "razorpay",
    eventType,
    level: matchedPayment ? "info" : "warning",
    rawPayload: payload,
    paymentId: matchedPayment ? matchedPayment.id : null,
  });

  if (!matchedPayment) {
    return { status: "no_matching_payment", logId: log.id };
  }

  if (matchedPayment.status === "success" || matchedPayment.status === "refunded") {
    return { status: "already_processed" };
  }

  try {
    if (eventType === "payment.captured") {
      await handleCaptured(matchedPayment, paymentEntity);
      return { status: "processed_success" };
    }

    if (eventType === "payment.authorized") {
      await paymentsService.markPaymentResult(matchedPayment.id, {
        status: "authorized",
        gatewayRef: paymentEntity?.id,
        paymentId: paymentEntity?.id,
        paymentMethod: mapPaymentMethod(paymentEntity?.method),
      });
      return { status: "processed_authorized" };
    }

    if (eventType === "payment.failed") {
      await paymentsService.markPaymentResult(matchedPayment.id, {
        status: "failed",
        gatewayRef: paymentEntity?.id,
        paymentId: paymentEntity?.id,
        paymentMethod: mapPaymentMethod(paymentEntity?.method),
        failureCode: paymentEntity?.error_code,
        failureReason: paymentEntity?.error_description,
      });
      return { status: "processed_failed" };
    }

    // Unhandled event types (refund.processed, order.paid, etc.) are
    // logged above but not acted on yet -- extend here as needed.
    return { status: "event_type_not_handled" };
  } catch (error) {
    await paymentLogsService.recordEvent({
      traceId: `${eventId || "no-event-id"}-error`,
      requestId,
      endpoint,
      gateway: "razorpay",
      eventType: `${eventType}.processing_error`,
      level: "error",
      rawPayload: { message: error.message, originalPayload: payload },
      paymentId: matchedPayment.id,
    });
    return { status: "processing_error", error: error.message };
  }
}

/*
Success path for a coin_purchase Payment: mark it success at the gateway
level, then actually credit the wallet and link the two records.
Subscription/rj_tip success paths aren't implemented yet -- they're
logged as "not_handled" for manual reconciliation rather than silently
dropped.
*/
async function handleCaptured(matchedPayment, paymentEntity) {
  const updated = await paymentsService.markPaymentResult(matchedPayment.id, {
    status: "success",
    gatewayRef: paymentEntity?.id,
    paymentId: paymentEntity?.id,
    paymentMethod: mapPaymentMethod(paymentEntity?.method),
  });

  if (matchedPayment.type === "coin_purchase" && matchedPayment.coinPackageId) {
    const { transaction } = await coinTransactionService.completePurchase({
      userId: matchedPayment.userId,
      coinPackageId: matchedPayment.coinPackageId,
      paymentProvider: "razorpay",
      paymentId: paymentEntity?.id,
      paymentOrderId: matchedPayment.orderId,
      paymentMethod: mapPaymentMethod(paymentEntity?.method),
    });

    await paymentsService.linkCoinTransaction(matchedPayment.id, transaction.id);
  }

  return updated;
}

module.exports = { handleRazorpayEvent };
