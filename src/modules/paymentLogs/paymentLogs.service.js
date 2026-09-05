const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");

const repo = require("./paymentLogs.repository");

function toLogCode(id) {
  return `LOG-${id.toString().padStart(5, "0")}`;
}

function serializeLog(item) {
  return {
    id: item.id.toString(),
    logCode: toLogCode(item.id),

    traceId: item.traceId,
    requestId: item.requestId,
    endpoint: item.endpoint,

    gateway: item.gateway,
    eventType: item.eventType,
    level: item.level,

    rawPayload: item.rawPayload,

    createdAt: item.createdAt,

    payment: item.payment
      ? {
          id: item.payment.id.toString(),
          displayCode: item.payment.displayCode,
          gateway: item.payment.gateway,
          userFullName: item.payment.user?.fullName || null,
        }
      : undefined,
  };
}

async function listLogs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { logs, total } = await repo.listLogs({
    page,
    limit,
    search: query.search,
    eventType: query.eventType,
    level: query.level,
    gateway: query.gateway,
  });

  return {
    logs: logs.map(serializeLog),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getLogById(id) {
  const log = await repo.findById(id);

  if (!log) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Log entry not found");
  }

  return serializeLog(log);
}

async function getDashboard() {
  const stats = await repo.getStats();
  return { stats };
}

/*
Called by the webhook receiver, not by any admin route. Kept here so the
whole payments pipeline (payments -> logs) writes through one place.
*/
async function recordEvent(data) {
  const created = await repo.record(data);
  return serializeLog(created);
}

module.exports = {
  listLogs,
  getLogById,
  getDashboard,
  recordEvent,
};
