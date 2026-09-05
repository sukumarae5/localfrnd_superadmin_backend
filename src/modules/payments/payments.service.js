const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");

const repo = require("./payments.repository");

function serializePayment(item) {
  return {
    id: item.id.toString(),
    publicId: item.publicId,
    displayCode: item.displayCode,

    type: item.type,
    gateway: item.gateway,
    gatewayRef: item.gatewayRef,
    orderId: item.orderId,
    paymentId: item.paymentId,

    baseAmount: Number(item.baseAmount),
    gstAmount: Number(item.gstAmount),
    totalAmount: Number(item.totalAmount),
    currency: item.currency,

    status: item.status,
    paymentMethod: item.paymentMethod,

    failureCode: item.failureCode,
    failureReason: item.failureReason,

    initiatedAt: item.initiatedAt,
    authorizedAt: item.authorizedAt,
    completedAt: item.completedAt,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    user: item.user
      ? {
          id: item.user.id.toString(),
          publicId: item.user.publicId,
          fullName: item.user.fullName,
          mobile: `${item.user.mobileCountryCode}${item.user.mobileNumber}`,
        }
      : undefined,

    coinTransaction: item.coinTransaction
      ? {
          id: item.coinTransaction.id.toString(),
          publicId: item.coinTransaction.publicId,
          totalCoins: item.coinTransaction.totalCoins,
        }
      : undefined,

    subscription: item.subscription
      ? {
          id: item.subscription.id.toString(),
          planId: item.subscription.planId,
          pricePaid: item.subscription.pricePaid ? Number(item.subscription.pricePaid) : null,
        }
      : undefined,

    refunds: item.refunds
      ? item.refunds.map((r) => ({
          id: r.id.toString(),
          publicId: r.publicId,
          displayCode: r.displayCode,
          status: r.status,
          requestedAmount: Number(r.requestedAmount),
          approvedAmount: r.approvedAmount ? Number(r.approvedAmount) : null,
          requestedAt: r.requestedAt,
          resolvedAt: r.resolvedAt,
        }))
      : undefined,
  };
}

async function listPayments(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { payments, total } = await repo.listPayments({
    page,
    limit,
    search: query.search,
    type: query.type,
    gateway: query.gateway,
    status: query.status,
    userId: query.userId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });

  return {
    payments: payments.map(serializePayment),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getPaymentByIdOrCode(idOrCode) {
  const payment = await repo.findByIdOrCode(idOrCode);

  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found");
  }

  return serializePayment(payment);
}

async function getDashboard() {
  const [stats, revenueByType] = await Promise.all([
    repo.getStats(),
    repo.getRevenueByType(),
  ]);

  return { stats, revenueByType };
}

/*
Called by the webhook handler (not yet built) when a gateway order is
first created. userId + coinTransactionId/subscriptionId are mutually
exclusive per `type` -- caller is responsible for passing the right one.
*/
async function recordInitiatedPayment({
  userId,
  type,
  gateway,
  orderId,
  baseAmount,
  gstAmount,
  totalAmount,
  currency,
  coinPackageId,
  coinTransactionId,
  subscriptionId,
}) {
  return repo.create({
    userId: BigInt(userId),
    type,
    gateway,
    orderId,
    baseAmount,
    gstAmount: gstAmount || 0,
    totalAmount,
    currency: currency || "INR",
    status: "initiated",
    coinPackageId: coinPackageId ? Number(coinPackageId) : null,
    coinTransactionId: coinTransactionId ? BigInt(coinTransactionId) : null,
    subscriptionId: subscriptionId ? BigInt(subscriptionId) : null,
  });
}

/*
Called by the webhook handler after it actually credits the wallet, to
retroactively link the Payment row to the CoinTransaction it produced.
*/
async function linkCoinTransaction(paymentId, coinTransactionId) {
  return repo.updateStatus(paymentId, { coinTransactionId: BigInt(coinTransactionId) });
}

async function findByOrderId(orderId) {
  return repo.findByOrderId(orderId);
}

/*
Called by the webhook handler when the gateway confirms success/failure.
*/
async function markPaymentResult(id, { status, gatewayRef, paymentId, paymentMethod, failureCode, failureReason }) {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found");
  }

  const data = {
    status,
    gatewayRef,
    paymentId,
    paymentMethod,
    failureCode: failureCode || null,
    failureReason: failureReason || null,
  };

  if (status === "authorized") data.authorizedAt = new Date();
  if (status === "success" || status === "failed") data.completedAt = new Date();

  const updated = await repo.updateStatus(id, data);
  return serializePayment(updated);
}

module.exports = {
  listPayments,
  getPaymentByIdOrCode,
  getDashboard,
  recordInitiatedPayment,
  markPaymentResult,
  linkCoinTransaction,
  findByOrderId,
};
