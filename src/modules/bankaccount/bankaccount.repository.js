const { prisma } = require("../../config/database");

function buildWhere({ status, search, accountOrUpi, bankName, duplicatesOnly }) {
  const where = { deletedAt: null };

  if (status) where.status = status;

  if (search) {
    where.OR = [
      { rj: { displayCode: { contains: search, mode: "insensitive" } } },
      { rj: { user: { fullName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (accountOrUpi) {
    where.OR = [
      ...(where.OR || []),
      { accountNumber: { contains: accountOrUpi } },
      { upiId: { contains: accountOrUpi, mode: "insensitive" } },
    ];
  }

  if (bankName) where.bankName = { contains: bankName, mode: "insensitive" };
  if (duplicatesOnly) where.isDuplicateFlagged = true;

  return where;
}

const detailInclude = {
  rj: {
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
    },
  },
  verifiedBy: { select: { fullName: true } },
  logs: {
    orderBy: { createdAt: "desc" },
    include: { performedBy: { select: { fullName: true } } },
  },
};

async function listBankAccounts({ page, limit, ...filters }) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;

  const [rows, total] = await prisma.$transaction([
    prisma.rJBankAccount.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        rj: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
      },
    }),
    prisma.rJBankAccount.count({ where }),
  ]);

  return { rows, total };
}

// Stat cards on the Bank Details Management screen (image 4):
// Total Bank Accounts, Verified (+%), Pending, Bank Transfers, Updated Today, Duplicates Detected
async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, verified, pending, bankTransfers, updatedToday, duplicates] =
    await prisma.$transaction([
      prisma.rJBankAccount.count({ where: { deletedAt: null } }),
      prisma.rJBankAccount.count({ where: { deletedAt: null, status: "verified" } }),
      prisma.rJBankAccount.count({ where: { deletedAt: null, status: "pending" } }),
      prisma.rJBankAccount.count({ where: { deletedAt: null, ifscCode: { not: null } } }),
      prisma.rJBankAccount.count({ where: { deletedAt: null, updatedAt: { gte: startOfToday } } }),
      prisma.rJBankAccount.count({ where: { deletedAt: null, isDuplicateFlagged: true } }),
    ]);

  return {
    totalBankAccounts: total,
    verifiedCount: verified,
    verifiedPct: total ? Number(((verified / total) * 100).toFixed(1)) : 0,
    pendingCount: pending,
    bankTransfersCount: bankTransfers,
    updatedTodayCount: updatedToday,
    duplicatesDetectedCount: duplicates,
  };
}

function findByPublicId(publicId) {
  return prisma.rJBankAccount.findFirst({
    where: { publicId, deletedAt: null },
    include: detailInclude,
  });
}

// Same-account-number matches across other RJs — powers the Duplicate Risk Radar panel
function findDuplicatesByAccountNumber(accountNumber, excludeId) {
  return prisma.rJBankAccount.findMany({
    where: { accountNumber, deletedAt: null, id: { not: excludeId } },
    select: { id: true, publicId: true, rj: { select: { displayCode: true } } },
  });
}

// All mutation entrypoints take `publicId` (the route param, uuid) — never
// the internal BigInt id — so this module doesn't repeat the inconsistency
// in withdrawal.repository.js, where getOne() resolves by publicId/displayCode
// but approve()/reject() silently expect the internal numeric id instead.
// See AUDIT NOTE in bankAccount README for details on that existing bug.

async function approve(publicId, adminId, { note, markPrimary }) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.rJBankAccount.findFirst({ where: { publicId, deletedAt: null } });
    if (!account) throw new Error("BANK_ACCOUNT_NOT_FOUND");

    if (markPrimary) {
      await tx.rJBankAccount.updateMany({
        where: { rjId: account.rjId, id: { not: account.id } },
        data: { isPrimary: false },
      });
    }

    const updated = await tx.rJBankAccount.update({
      where: { id: account.id },
      data: {
        status: "verified",
        verifiedById: adminId ? BigInt(adminId) : null,
        verifiedAt: new Date(),
        isPrimary: markPrimary || undefined,
        adminNotes: note || undefined,
      },
      include: detailInclude,
    });

    await tx.rJBankAccountVerificationLog.create({
      data: { bankAccountId: account.id, action: "approved", note, performedById: adminId ? BigInt(adminId) : null },
    });

    return updated;
  });
}

async function reject(publicId, adminId, { reason }) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.rJBankAccount.findFirst({ where: { publicId, deletedAt: null } });
    if (!account) throw new Error("BANK_ACCOUNT_NOT_FOUND");

    const updated = await tx.rJBankAccount.update({
      where: { id: account.id },
      data: { status: "rejected", rejectionReason: reason },
      include: detailInclude,
    });

    await tx.rJBankAccountVerificationLog.create({
      data: { bankAccountId: account.id, action: "rejected", note: reason, performedById: adminId ? BigInt(adminId) : null },
    });

    return updated;
  });
}

async function addNote(publicId, adminId, note) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.rJBankAccount.findFirst({ where: { publicId, deletedAt: null } });
    if (!account) throw new Error("BANK_ACCOUNT_NOT_FOUND");

    const updated = await tx.rJBankAccount.update({
      where: { id: account.id },
      data: { adminNotes: note },
      include: detailInclude,
    });

    await tx.rJBankAccountVerificationLog.create({
      data: { bankAccountId: account.id, action: "note_added", note, performedById: adminId ? BigInt(adminId) : null },
    });

    return updated;
  });
}

async function retryPennyDrop(publicId, adminId) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.rJBankAccount.findFirst({ where: { publicId, deletedAt: null } });
    if (!account) throw new Error("BANK_ACCOUNT_NOT_FOUND");

    const updated = await tx.rJBankAccount.update({
      where: { id: account.id },
      data: { pennyDropStatus: "retry" },
      include: detailInclude,
    });

    await tx.rJBankAccountVerificationLog.create({
      data: { bankAccountId: account.id, action: "penny_drop_retry", performedById: adminId ? BigInt(adminId) : null },
    });

    return updated;
  });
}

module.exports = {
  listBankAccounts,
  getStats,
  findByPublicId,
  findDuplicatesByAccountNumber,
  approve,
  reject,
  addNote,
  retryPennyDrop,
};