const { prisma } = require("../../config/database");

function buildWithdrawalWhere({ status, search, category, amountMin, amountMax, kycStatus, paymentMethod }) {
  const where = {};
  if (status === "approved") {
    // "Approved" tab covers the whole post-approval lifecycle, same grouping as getApprovedStats()
    where.status = { in: ["approved", "processing", "success"] };
  } else if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { displayCode: { contains: search, mode: "insensitive" } },
      { rj: { displayCode: { contains: search, mode: "insensitive" } } },
      { rj: { user: { fullName: { contains: search, mode: "insensitive" } } } },
    ];
  }
  if (category) {
    where.rj = { ...where.rj, categories: { some: { category: { code: category } } } };
  }
  if (amountMin !== undefined || amountMax !== undefined) {
    where.amount = {};
    if (amountMin !== undefined) where.amount.gte = amountMin;
    if (amountMax !== undefined) where.amount.lte = amountMax;
  }
  if (kycStatus) where.rj = { ...where.rj, verificationStatus: kycStatus };
  if (paymentMethod) where.method = paymentMethod;
  return where;
}

const detailInclude = {
  rj: {
    include: {
      user: { select: { fullName: true, avatarUrl: true, bio: true } },
      categories: { include: { category: true } },
    },
  },
  processedBy: { select: { fullName: true } },
  appealReviewedBy: { select: { fullName: true } },
};

async function listWithdrawals({ page, limit, ...filters }) {
  const where = buildWithdrawalWhere(filters);
  const skip = (page - 1) * limit;

  const [rows, total] = await prisma.$transaction([
    prisma.rJPayout.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: detailInclude,
    }),
    prisma.rJPayout.count({ where }),
  ]);

  return { rows, total };
}

async function getPendingStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalAgg, pendingCount, receivedToday, highPriorityCount, kycPending, bankPending, waitingOver24h] =
    await prisma.$transaction([
      prisma.rJPayout.aggregate({ where: { status: "pending" }, _sum: { amount: true }, _avg: { amount: true } }),
      prisma.rJPayout.count({ where: { status: "pending" } }),
      prisma.rJPayout.count({ where: { status: "pending", createdAt: { gte: startOfToday } } }),
      prisma.rJPayout.count({ where: { status: "pending", isHighPriority: true } }),
      prisma.rJPayout.count({ where: { status: "pending", rj: { verificationStatus: { not: "verified" } } } }),
      prisma.rJPayout.count({ where: { status: "pending", method: null } }),
      prisma.rJPayout.count({ where: { status: "pending", createdAt: { lte: dayAgo } } }),
    ]);

  return {
    totalPending: totalAgg._sum.amount || 0,
    pendingRequestsCount: pendingCount,
    receivedToday,
    highPriorityCount,
    avgWithdrawal: totalAgg._avg.amount || 0,
    kycPendingCount: kycPending,
    bankPendingCount: bankPending,
    waitingOver24h,
  };
}

async function getApprovedStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalAgg, todaysPayoutAgg, pendingSettlement] = await prisma.$transaction([
    prisma.rJPayout.aggregate({
      where: { status: { in: ["approved", "processing", "success"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rJPayout.aggregate({ where: { status: "success", processedAt: { gte: startOfToday } }, _sum: { amount: true } }),
    prisma.rJPayout.count({ where: { status: "processing" } }),
  ]);

  return {
    totalApproved: totalAgg._count,
    totalApprovedAmount: totalAgg._sum.amount || 0,
    todaysPayouts: todaysPayoutAgg._sum.amount || 0,
    pendingSettlement,
  };
}

async function getRejectedStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalRejected, rejectedAmountAgg, todaysRejections, fraudulent, kycFailed, bankFailed, duplicate, appealRequests, totalRequests] =
    await prisma.$transaction([
      prisma.rJPayout.count({ where: { status: "rejected" } }),
      prisma.rJPayout.aggregate({ where: { status: "rejected" }, _sum: { amount: true } }),
      prisma.rJPayout.count({ where: { status: "rejected", rejectedAt: { gte: startOfToday } } }),
      prisma.rJPayout.count({ where: { status: "rejected", rejectionCode: "FRAUD_DETECTED" } }),
      prisma.rJPayout.count({ where: { status: "rejected", rejectionCode: "KYC_FAILED" } }),
      prisma.rJPayout.count({ where: { status: "rejected", rejectionCode: "BANK_VERIFICATION_FAILED" } }),
      prisma.rJPayout.count({ where: { status: "rejected", rejectionCode: "DUPLICATE_REQUEST" } }),
      prisma.rJPayout.count({ where: { appealStatus: "pending" } }),
      prisma.rJPayout.count(),
    ]);

  return {
    totalRejected,
    rejectedAmount: rejectedAmountAgg._sum.amount || 0,
    todaysRejections,
    fraudulentCount: fraudulent,
    rejectionRate: totalRequests ? Number(((totalRejected / totalRequests) * 100).toFixed(1)) : 0,
    kycFailedCount: kycFailed,
    bankVerifFailedCount: bankFailed,
    duplicateCount: duplicate,
    appealRequestsCount: appealRequests,
  };
}

function findByPublicOrDisplayId(idOrCode) {
  return prisma.rJPayout.findFirst({
    where: { OR: [{ publicId: idOrCode }, { displayCode: idOrCode }] },
    include: detailInclude,
  });
}

// Approve: moves status -> processing, immediately debits RJWallet and logs
// an RJWalletTransaction(type: withdrawal) — all inside one DB transaction
// so the wallet, the ledger row, and the request status never drift apart.
async function approve(id, adminId) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.rJPayout.findUnique({ where: { id: BigInt(id) } });
    if (!payout) throw new Error("WITHDRAWAL_NOT_FOUND");
    if (payout.status !== "pending") throw new Error("INVALID_STATUS_TRANSITION");

    const wallet = await tx.rJWallet.findUnique({ where: { rjId: payout.rjId } });
    if (!wallet || Number(wallet.balance) < Number(payout.amount)) {
      throw new Error("INSUFFICIENT_RJ_BALANCE");
    }

    const newBalance = Number(wallet.balance) - Number(payout.amount);
    await tx.rJWallet.update({ where: { rjId: payout.rjId }, data: { balance: newBalance } });

    await tx.rJWalletTransaction.create({
      data: {
        rjId: payout.rjId,
        type: "withdrawal",
        amount: payout.amount,
        balanceAfter: newBalance,
        description: `Withdrawal ${payout.displayCode} approved`,
        initiatedById: adminId ? BigInt(adminId) : null,
      },
    });

    return tx.rJPayout.update({
      where: { id: BigInt(id) },
      data: { status: "processing", approvedAt: new Date(), processedById: adminId ? BigInt(adminId) : null },
      include: detailInclude,
    });
  });
}

async function reject(id, { rejectionCode, rejectionReason }, adminId) {
  const payout = await prisma.rJPayout.findUnique({ where: { id: BigInt(id) } });
  if (!payout) throw new Error("WITHDRAWAL_NOT_FOUND");
  if (payout.status !== "pending") throw new Error("INVALID_STATUS_TRANSITION");

  return prisma.rJPayout.update({
    where: { id: BigInt(id) },
    data: {
      status: "rejected",
      rejectionCode,
      rejectionReason,
      rejectedAt: new Date(),
      processedById: adminId ? BigInt(adminId) : null,
    },
    include: detailInclude,
  });
}

async function bulkApprove(ids, adminId) {
  const results = [];
  for (const id of ids) {
    try {
      results.push({ id, success: true, data: await approve(id, adminId) });
    } catch (err) {
      results.push({ id, success: false, error: err.message });
    }
  }
  return results;
}

async function bulkReject(ids, body, adminId) {
  const results = [];
  for (const id of ids) {
    try {
      results.push({ id, success: true, data: await reject(id, body, adminId) });
    } catch (err) {
      results.push({ id, success: false, error: err.message });
    }
  }
  return results;
}

async function dismissAppeal(id, adminId) {
  const payout = await prisma.rJPayout.findUnique({ where: { id: BigInt(id) } });
  if (!payout) throw new Error("WITHDRAWAL_NOT_FOUND");
  if (payout.appealStatus !== "pending") throw new Error("NO_PENDING_APPEAL");

  return prisma.rJPayout.update({
    where: { id: BigInt(id) },
    data: { appealStatus: "rejected", appealReviewedById: adminId ? BigInt(adminId) : null, appealReviewedAt: new Date() },
    include: detailInclude,
  });
}

// Overrule: admin approves the withdrawal despite the earlier rejection —
// same wallet-debit + ledger flow as a normal approve().
async function approveOverrule(id, adminId) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.rJPayout.findUnique({ where: { id: BigInt(id) } });
    if (!payout) throw new Error("WITHDRAWAL_NOT_FOUND");
    if (payout.appealStatus !== "pending") throw new Error("NO_PENDING_APPEAL");

    const wallet = await tx.rJWallet.findUnique({ where: { rjId: payout.rjId } });
    if (!wallet || Number(wallet.balance) < Number(payout.amount)) {
      throw new Error("INSUFFICIENT_RJ_BALANCE");
    }

    const newBalance = Number(wallet.balance) - Number(payout.amount);
    await tx.rJWallet.update({ where: { rjId: payout.rjId }, data: { balance: newBalance } });

    await tx.rJWalletTransaction.create({
      data: {
        rjId: payout.rjId,
        type: "withdrawal",
        amount: payout.amount,
        balanceAfter: newBalance,
        description: `Withdrawal ${payout.displayCode} approved on appeal overrule`,
        initiatedById: adminId ? BigInt(adminId) : null,
      },
    });

    return tx.rJPayout.update({
      where: { id: BigInt(id) },
      data: {
        status: "processing",
        appealStatus: "accepted",
        appealReviewedById: adminId ? BigInt(adminId) : null,
        appealReviewedAt: new Date(),
        approvedAt: new Date(),
      },
      include: detailInclude,
    });
  });
}

function generateDisplayCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `WD-${rand}`;
}

// RJ creates their own withdrawal request. Balance is only *validated* here,
// not debited — the actual debit happens at admin approve() time, matching
// the rest of the module's "debit on approval" convention.
async function createWithdrawalRequest(rjId, { amount, method, vpa, bankAccountMasked, ifscCode }) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.rJWallet.findUnique({ where: { rjId: BigInt(rjId) } });
    if (!wallet) throw new Error("RJ_WALLET_NOT_FOUND");
    if (Number(wallet.balance) < Number(amount)) throw new Error("INSUFFICIENT_RJ_BALANCE");

    // One outstanding request at a time — prevents an RJ stacking multiple
    // pending requests that together exceed their real balance.
    const existingPending = await tx.rJPayout.findFirst({ where: { rjId: BigInt(rjId), status: "pending" } });
    if (existingPending) throw new Error("PENDING_REQUEST_EXISTS");

    const rj = await tx.rJ.findUnique({ where: { id: BigInt(rjId) } });

    let created;
    let attempts = 0;
    while (!created && attempts < 5) {
      try {
        created = await tx.rJPayout.create({
          data: {
            rjId: BigInt(rjId),
            displayCode: generateDisplayCode(),
            amount,
            withdrawableBalance: wallet.balance,
            status: "pending",
            method,
            vpa: vpa || null,
            bankAccountMasked: bankAccountMasked || null,
            ifscCode: ifscCode || null,
            verificationPct: rj.verificationStatus === "verified" ? 100 : 60,
            verificationChecklist: {
              kycVerified: rj.verificationStatus === "verified",
              payoutMethodProvided: !!(vpa || bankAccountMasked),
            },
          },
          include: detailInclude,
        });
      } catch (err) {
        if (err.code === "P2002") { attempts++; continue; } // displayCode collision — retry with a new one
        throw err;
      }
    }
    if (!created) throw new Error("DISPLAY_CODE_GENERATION_FAILED");
    return created;
  });
}

function listForRj(rjId, { page, limit, status }) {
  const where = { rjId: BigInt(rjId) };
  if (status) where.status = status;
  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.rJPayout.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.rJPayout.count({ where }),
  ]);
}

function findForRj(rjId, idOrCode) {
  return prisma.rJPayout.findFirst({
    where: { rjId: BigInt(rjId), OR: [{ publicId: idOrCode }, { displayCode: idOrCode }] },
    include: detailInclude,
  });
}

async function raiseAppeal(rjId, idOrCode, appealMessage) {
  const payout = await prisma.rJPayout.findFirst({
    where: { rjId: BigInt(rjId), OR: [{ publicId: idOrCode }, { displayCode: idOrCode }] },
  });
  if (!payout) throw new Error("WITHDRAWAL_NOT_FOUND");
  if (payout.status !== "rejected") throw new Error("ONLY_REJECTED_CAN_APPEAL");
  if (payout.appealStatus === "pending") throw new Error("APPEAL_ALREADY_PENDING");

  return prisma.rJPayout.update({
    where: { id: payout.id },
    data: { appealStatus: "pending", appealMessage, appealReviewedById: null, appealReviewedAt: null },
    include: detailInclude,
  });
}

module.exports = {
  listWithdrawals,
  getPendingStats,
  getApprovedStats,
  getRejectedStats,
  findByPublicOrDisplayId,
  approve,
  reject,
  bulkApprove,
  bulkReject,
  dismissAppeal,
  approveOverrule,
  createWithdrawalRequest,
  listForRj,
  findForRj,
  raiseAppeal,
};