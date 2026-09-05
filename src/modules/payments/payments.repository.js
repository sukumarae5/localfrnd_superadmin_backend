const { prisma } = require("../../config/database");

const listInclude = {
  user: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      mobileCountryCode: true,
      mobileNumber: true,
    },
  },
};

const detailInclude = {
  ...listInclude,
  coinTransaction: {
    select: { id: true, publicId: true, coinPackageId: true, totalCoins: true },
  },
  subscription: {
    select: { id: true, planId: true, pricePaid: true },
  },
  refunds: {
    orderBy: { requestedAt: "desc" },
  },
};

function buildWhere({ search, type, gateway, status, userId, dateFrom, dateTo }) {
  const where = {};

  if (type) where.type = type;
  if (gateway) where.gateway = gateway;
  if (status) where.status = status;
  if (userId) where.userId = BigInt(userId);

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { orderId: { contains: search, mode: "insensitive" } },
      { paymentId: { contains: search, mode: "insensitive" } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

async function listPayments({ page, limit, ...filters }) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: listInclude,
      orderBy: { createdAt: "desc" },
    }),

    prisma.payment.count({ where }),
  ]);

  return { payments, total };
}

async function findByIdOrCode(idOrCode) {
  return prisma.payment.findFirst({
    where: { OR: [{ publicId: idOrCode }, { displayCode: idOrCode }] },
    include: detailInclude,
  });
}

/*
Dashboard stat cards for the All/Successful/Failed Payments screens.
Run as one $transaction so every count reflects the same instant.
*/
async function getStats() {
  const [
    totalCount,
    successCount,
    pendingCount,
    failedCount,
    refundedCount,
    revenueAgg,
    todayRevenueAgg,
    gatewayCount,
  ] = await prisma.$transaction([
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "success" } }),
    prisma.payment.count({ where: { status: { in: ["initiated", "authorized"] } } }),
    prisma.payment.count({ where: { status: "failed" } }),
    prisma.payment.count({ where: { status: "refunded" } }),

    prisma.payment.aggregate({
      where: { status: "success" },
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
    }),

    prisma.payment.aggregate({
      where: {
        status: "success",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { totalAmount: true },
    }),

    prisma.paymentGatewayConfig.count({ where: { isActive: true } }),
  ]);

  return {
    totalCount,
    successCount,
    pendingCount,
    failedCount,
    refundedCount,
    activeGateways: gatewayCount,
    totalRevenue: Number(revenueAgg._sum.totalAmount || 0),
    avgTransaction: Number(revenueAgg._avg.totalAmount || 0),
    todayRevenue: Number(todayRevenueAgg._sum.totalAmount || 0),
    successRate: totalCount > 0 ? Number(((successCount / totalCount) * 100).toFixed(1)) : 0,
  };
}

/*
Revenue split by type -- powers the "Revenue by Type" panel
(coin purchases / subscriptions / rj tips).
*/
async function getRevenueByType() {
  const rows = await prisma.payment.groupBy({
    by: ["type"],
    where: { status: "success" },
    _sum: { totalAmount: true },
  });

  return rows.map((r) => ({
    type: r.type,
    revenue: Number(r._sum.totalAmount || 0),
  }));
}

function generateDisplayCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `PAY-${rand}`;
}

/*
Called by the (future) webhook handler when a gateway order is first
created -- not exposed as an admin-facing create endpoint. Sequential
displayCode retry loop matches the withdrawal module's convention.
*/
async function create(data) {
  let created;
  let attempts = 0;

  while (!created && attempts < 5) {
    try {
      created = await prisma.payment.create({
        data: { ...data, displayCode: generateDisplayCode() },
        include: detailInclude,
      });
    } catch (err) {
      if (err.code === "P2002" && err.meta?.target?.includes("display_code")) {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  if (!created) throw new Error("DISPLAY_CODE_GENERATION_FAILED");
  return created;
}

async function updateStatus(id, data) {
  return prisma.payment.update({
    where: { id: BigInt(id) },
    data,
    include: detailInclude,
  });
}

async function findById(id) {
  return prisma.payment.findUnique({ where: { id: BigInt(id) } });
}

async function findByOrderId(orderId) {
  return prisma.payment.findFirst({ where: { orderId } });
}

module.exports = {
  listPayments,
  findByIdOrCode,
  findById,
  findByOrderId,
  getStats,
  getRevenueByType,
  create,
  updateStatus,
};
