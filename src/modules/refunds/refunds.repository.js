const { prisma } = require("../../config/database");

const detailInclude = {
  payment: {
    include: {
      user: {
        select: { id: true, publicId: true, fullName: true, mobileCountryCode: true, mobileNumber: true },
      },
    },
  },
  requestedBy: { select: { id: true, fullName: true } },
  resolvedBy: { select: { id: true, fullName: true } },
};

function buildWhere({ search, status }) {
  const where = {};

  if (status) where.status = status;

  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { payment: { displayCode: { contains: search, mode: "insensitive" } } },
      { payment: { user: { fullName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  return where;
}

async function listRefunds({ page, limit, search, status }) {
  const where = buildWhere({ search, status });
  const skip = (page - 1) * limit;

  const [refunds, total] = await prisma.$transaction([
    prisma.refund.findMany({
      where,
      skip,
      take: limit,
      include: detailInclude,
      orderBy: { requestedAt: "desc" },
    }),

    prisma.refund.count({ where }),
  ]);

  return { refunds, total };
}

async function findByIdOrCode(idOrCode) {
  return prisma.refund.findFirst({
    where: { OR: [{ publicId: idOrCode }, { displayCode: idOrCode }] },
    include: detailInclude,
  });
}

async function getStats() {
  const [total, pending, approved, rejected, completed, amountAgg] = await prisma.$transaction([
    prisma.refund.count(),
    prisma.refund.count({ where: { status: "pending" } }),
    prisma.refund.count({ where: { status: "approved" } }),
    prisma.refund.count({ where: { status: "rejected" } }),
    prisma.refund.count({ where: { status: "completed" } }),
    prisma.refund.aggregate({
      where: { status: "completed" },
      _sum: { approvedAmount: true },
    }),
  ]);

  return {
    total,
    pending,
    approved,
    rejected,
    completed,
    totalRefundAmount: Number(amountAgg._sum.approvedAmount || 0),
    successRate: total > 0 ? Number((((approved + completed) / total) * 100).toFixed(1)) : 0,
  };
}

function generateDisplayCode() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RF-${rand}`;
}

/*
Creates a pending Refund request against a successful Payment. Does not
touch the wallet -- that only happens at approve() time.
*/
async function create({ paymentId, requestedAmount, reason, requestedById }) {
  const payment = await prisma.payment.findUnique({ where: { id: BigInt(paymentId) } });

  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.status !== "success") throw new Error("PAYMENT_NOT_REFUNDABLE");

  const amount = requestedAmount || Number(payment.totalAmount);

  if (amount > Number(payment.totalAmount)) throw new Error("REFUND_EXCEEDS_PAYMENT");

  let created;
  let attempts = 0;

  while (!created && attempts < 5) {
    try {
      created = await prisma.refund.create({
        data: {
          paymentId: BigInt(paymentId),
          displayCode: generateDisplayCode(),
          requestedAmount: amount,
          reason,
          status: "pending",
          requestedById: requestedById ? BigInt(requestedById) : null,
        },
        include: detailInclude,
      });
    } catch (err) {
      if (err.code === "P2002") {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  if (!created) throw new Error("DISPLAY_CODE_GENERATION_FAILED");
  return created;
}

/*
Approves a refund: credits the user's wallet, marks the Refund completed,
and marks the source Payment as refunded -- all in one transaction so a
partial refund state can never be persisted.
*/
async function approve(id, { approvedAmount, resolutionNote, resolvedById }) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({
      where: { id: BigInt(id) },
      include: { payment: true },
    });

    if (!refund) throw new Error("REFUND_NOT_FOUND");
    if (refund.status !== "pending") throw new Error("REFUND_NOT_PENDING");

    const amount = approvedAmount || Number(refund.requestedAmount);

    const wallet = await tx.userWallet.findUnique({ where: { userId: refund.payment.userId } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    const updatedWallet = await tx.userWallet.update({
      where: { userId: refund.payment.userId },
      data: { balance: Number(wallet.balance) + amount },
    });

    await tx.walletTransaction.create({
      data: {
        userId: refund.payment.userId,
        type: "refund",
        status: "completed",
        amount,
        coins: 0,
        balanceAfter: updatedWallet.balance,
        description: `Refund for payment ${refund.payment.displayCode}`,
        referenceId: refund.displayCode,
        initiatedById: resolvedById ? BigInt(resolvedById) : null,
      },
    });

    await tx.payment.update({
      where: { id: refund.paymentId },
      data: { status: "refunded" },
    });

    return tx.refund.update({
      where: { id: BigInt(id) },
      data: {
        status: "completed",
        approvedAmount: amount,
        resolutionNote: resolutionNote || null,
        resolvedById: resolvedById ? BigInt(resolvedById) : null,
        resolvedAt: new Date(),
      },
      include: detailInclude,
    });
  });
}

async function reject(id, { resolutionNote, resolvedById }) {
  const refund = await prisma.refund.findUnique({ where: { id: BigInt(id) } });

  if (!refund) throw new Error("REFUND_NOT_FOUND");
  if (refund.status !== "pending") throw new Error("REFUND_NOT_PENDING");

  return prisma.refund.update({
    where: { id: BigInt(id) },
    data: {
      status: "rejected",
      resolutionNote: resolutionNote || null,
      resolvedById: resolvedById ? BigInt(resolvedById) : null,
      resolvedAt: new Date(),
    },
    include: detailInclude,
  });
}

module.exports = {
  listRefunds,
  findByIdOrCode,
  getStats,
  create,
  approve,
  reject,
};
