const { prisma } = require("../../config/database");

async function list() {
  return prisma.paymentGatewayConfig.findMany({
    orderBy: { gateway: "asc" },
  });
}

async function findByGateway(gateway) {
  return prisma.paymentGatewayConfig.findUnique({ where: { gateway } });
}

async function findById(id) {
  return prisma.paymentGatewayConfig.findUnique({ where: { id: Number(id) } });
}

async function create(data) {
  return prisma.paymentGatewayConfig.create({ data });
}

async function update(id, data) {
  return prisma.paymentGatewayConfig.update({
    where: { id: Number(id) },
    data,
  });
}

/*
Per-gateway ledger: transaction count, revenue, success rate -- powers
the "Detailed Gateway Ledger" table and each gateway card's stats.
Computed live from Payment rather than cached on PaymentGatewayConfig,
so it's always accurate.
*/
async function getGatewayLedger() {
  const configs = await prisma.paymentGatewayConfig.findMany({
    orderBy: { gateway: "asc" },
  });

  const rows = await Promise.all(
    configs.map(async (config) => {
      const [totalCount, successCount, revenueAgg] = await prisma.$transaction([
        prisma.payment.count({ where: { gateway: config.gateway } }),
        prisma.payment.count({ where: { gateway: config.gateway, status: "success" } }),
        prisma.payment.aggregate({
          where: { gateway: config.gateway, status: "success" },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        config,
        totalTransactions: totalCount,
        successCount,
        successRate: totalCount > 0 ? Number(((successCount / totalCount) * 100).toFixed(1)) : 0,
        totalRevenue: Number(revenueAgg._sum.totalAmount || 0),
      };
    })
  );

  return rows;
}

module.exports = {
  list,
  findByGateway,
  findById,
  create,
  update,
  getGatewayLedger,
};
