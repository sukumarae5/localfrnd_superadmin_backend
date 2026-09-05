const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");

const repo = require("./refunds.repository");

function serializeRefund(item) {
  return {
    id: item.id.toString(),
    publicId: item.publicId,
    displayCode: item.displayCode,

    requestedAmount: Number(item.requestedAmount),
    approvedAmount: item.approvedAmount ? Number(item.approvedAmount) : null,

    reason: item.reason,
    status: item.status,
    resolutionNote: item.resolutionNote,

    requestedAt: item.requestedAt,
    resolvedAt: item.resolvedAt,

    payment: item.payment
      ? {
          id: item.payment.id.toString(),
          publicId: item.payment.publicId,
          displayCode: item.payment.displayCode,
          totalAmount: Number(item.payment.totalAmount),
          gateway: item.payment.gateway,
          status: item.payment.status,
          user: item.payment.user
            ? {
                id: item.payment.user.id.toString(),
                fullName: item.payment.user.fullName,
                mobile: `${item.payment.user.mobileCountryCode}${item.payment.user.mobileNumber}`,
              }
            : undefined,
        }
      : undefined,

    requestedBy: item.requestedBy ? { id: item.requestedBy.id.toString(), fullName: item.requestedBy.fullName } : null,
    resolvedBy: item.resolvedBy ? { id: item.resolvedBy.id.toString(), fullName: item.resolvedBy.fullName } : null,
  };
}

async function listRefunds(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { refunds, total } = await repo.listRefunds({
    page,
    limit,
    search: query.search,
    status: query.status,
  });

  return {
    refunds: refunds.map(serializeRefund),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getRefundByIdOrCode(idOrCode) {
  const refund = await repo.findByIdOrCode(idOrCode);

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Refund not found");
  }

  return serializeRefund(refund);
}

async function getDashboard() {
  const stats = await repo.getStats();
  return { stats };
}

function mapKnownErrors(error) {
  const map = {
    PAYMENT_NOT_FOUND: [HTTP_STATUS.NOT_FOUND, "Payment not found"],
    PAYMENT_NOT_REFUNDABLE: [HTTP_STATUS.CONFLICT, "Only successful payments can be refunded"],
    REFUND_EXCEEDS_PAYMENT: [HTTP_STATUS.UNPROCESSABLE_ENTITY, "Refund amount cannot exceed the original payment"],
    REFUND_NOT_FOUND: [HTTP_STATUS.NOT_FOUND, "Refund not found"],
    REFUND_NOT_PENDING: [HTTP_STATUS.CONFLICT, "Only pending refunds can be resolved"],
    WALLET_NOT_FOUND: [HTTP_STATUS.NOT_FOUND, "Wallet not found for this user"],
    DISPLAY_CODE_GENERATION_FAILED: [HTTP_STATUS.INTERNAL_SERVER_ERROR, "Could not generate a unique refund code"],
  };

  const entry = map[error.message];
  if (entry) throw new ApiError(entry[0], entry[1]);
  throw error;
}

async function requestRefund(data, requestedById) {
  try {
    const created = await repo.create({
      paymentId: data.paymentId,
      requestedAmount: data.amount,
      reason: data.reason,
      requestedById,
    });

    return serializeRefund(created);
  } catch (error) {
    mapKnownErrors(error);
  }
}

async function approveRefund(id, data, resolvedById) {
  try {
    const updated = await repo.approve(id, {
      approvedAmount: data.approvedAmount,
      resolutionNote: data.resolutionNote,
      resolvedById,
    });

    return serializeRefund(updated);
  } catch (error) {
    mapKnownErrors(error);
  }
}

async function rejectRefund(id, data, resolvedById) {
  try {
    const updated = await repo.reject(id, {
      resolutionNote: data.resolutionNote,
      resolvedById,
    });

    return serializeRefund(updated);
  } catch (error) {
    mapKnownErrors(error);
  }
}

module.exports = {
  listRefunds,
  getRefundByIdOrCode,
  getDashboard,
  requestRefund,
  approveRefund,
  rejectRefund,
};
