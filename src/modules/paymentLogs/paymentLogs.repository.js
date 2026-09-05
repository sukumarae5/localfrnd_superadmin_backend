const { prisma } = require("../../config/database");

function buildWhere({ search, eventType, level, gateway }) {
  const where = {};

  if (eventType) where.eventType = eventType;
  if (level) where.level = level;
  if (gateway) where.gateway = gateway;

  if (search) {
    where.OR = [
      { traceId: { contains: search, mode: "insensitive" } },
      { requestId: { contains: search, mode: "insensitive" } },
      { payment: { displayCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

const listInclude = {
  payment: {
    select: {
      id: true,
      displayCode: true,
      gateway: true,
      user: { select: { fullName: true } },
    },
  },
};

async function listLogs({ page, limit, search, eventType, level, gateway }) {
  const where = buildWhere({ search, eventType, level, gateway });
  const skip = (page - 1) * limit;

  const [logs, total] = await prisma.$transaction([
    prisma.paymentWebhookLog.findMany({
      where,
      skip,
      take: limit,
      include: listInclude,
      orderBy: { createdAt: "desc" },
    }),

    prisma.paymentWebhookLog.count({ where }),
  ]);

  return { logs, total };
}

async function findById(id) {
  return prisma.paymentWebhookLog.findUnique({
    where: { id: BigInt(id) },
    include: listInclude,
  });
}

async function getStats() {
  const [total, errorCount, warningCount, infoCount] = await prisma.$transaction([
    prisma.paymentWebhookLog.count(),
    prisma.paymentWebhookLog.count({ where: { level: "error" } }),
    prisma.paymentWebhookLog.count({ where: { level: "warning" } }),
    prisma.paymentWebhookLog.count({ where: { level: "info" } }),
  ]);

  return {
    total,
    errorCount,
    warningCount,
    infoCount,
    failureRate: total > 0 ? Number(((errorCount / total) * 100).toFixed(1)) : 0,
  };
}

/*
Called by the (future) webhook receiver / gateway integration layer to
append a log row -- not exposed as an admin-facing write endpoint.
Append-only: never update or delete an existing log row.
*/
async function record({ traceId, requestId, endpoint, gateway, eventType, level, rawPayload, paymentId }) {
  return prisma.paymentWebhookLog.create({
    data: {
      traceId,
      requestId,
      endpoint,
      gateway,
      eventType,
      level: level || "info",
      rawPayload,
      paymentId: paymentId ? BigInt(paymentId) : null,
    },
  });
}

module.exports = {
  listLogs,
  findById,
  getStats,
  record,
};
