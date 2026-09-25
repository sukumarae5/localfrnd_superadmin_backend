// src/modules/rj/rings/rings.repository.js
const { prisma } = require("../../../config/database");
const { generateConversionCode, DEFAULT_CONVERSION_RATE, DEFAULT_MIN_CONVERTIBLE_RINGS } = require("./rings.constants");

function findWalletByRJId(rjId) {
  return prisma.rJWallet.findUnique({ where: { rjId: BigInt(rjId) } });
}

async function listRingTransactions({ rjId, page, limit, type }) {
  const where = { rjId: BigInt(rjId), ...(type ? { type } : {}) };
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.rJRingTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.rJRingTransaction.count({ where }),
  ]);

  return { transactions, total };
}

function listConversions(rjId, limit = 10) {
  return prisma.rJRingConversion.findMany({
    where: { rjId: BigInt(rjId) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Singleton settings row (id fixed at 1). Created lazily on first read so
// there's never a migration-order dependency on seeding it.
async function getOrCreateSetting() {
  const existing = await prisma.rJRingSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return prisma.rJRingSetting.create({
    data: {
      id: 1,
      conversionRate: DEFAULT_CONVERSION_RATE,
      minConvertibleRings: DEFAULT_MIN_CONVERTIBLE_RINGS,
    },
  });
}

async function updateSetting({ conversionRate, minConvertibleRings, updatedById }) {
  await getOrCreateSetting(); // ensure row exists before updating

  return prisma.rJRingSetting.update({
    where: { id: 1 },
    data: {
      ...(conversionRate !== undefined ? { conversionRate } : {}),
      ...(minConvertibleRings !== undefined ? { minConvertibleRings } : {}),
      updatedById: updatedById ? BigInt(updatedById) : null,
    },
  });
}

// The core operation: moves value from ringsBalance -> withdrawable balance.
// Mirrors withdrawal.repository.js's createWithdrawalRequest pattern —
// balance/threshold checks + a display-code retry loop, all inside one
// transaction so the wallet update and both ledger rows are atomic.
async function convertRings(rjId, rings) {
  return prisma.$transaction(async (tx) => {
    const setting = await tx.rJRingSetting.findUnique({ where: { id: 1 } });
    const conversionRate = setting ? setting.conversionRate : DEFAULT_CONVERSION_RATE;
    const minConvertibleRings = setting ? setting.minConvertibleRings : BigInt(DEFAULT_MIN_CONVERTIBLE_RINGS);

    if (BigInt(rings) < BigInt(minConvertibleRings)) {
      throw new Error(`MIN_RINGS_REQUIRED:${minConvertibleRings}`);
    }

    const wallet = await tx.rJWallet.findUnique({ where: { rjId: BigInt(rjId) } });
    if (!wallet) throw new Error("RJ_WALLET_NOT_FOUND");
    if (wallet.ringsBalance < BigInt(rings)) throw new Error("INSUFFICIENT_RINGS_BALANCE");

    const amountCredited = Number(rings) * Number(conversionRate);
    const newRingsBalance = wallet.ringsBalance - BigInt(rings);
    const newWalletBalance = Number(wallet.balance) + amountCredited;

    const updatedWallet = await tx.rJWallet.update({
      where: { rjId: BigInt(rjId) },
      data: { ringsBalance: newRingsBalance, balance: newWalletBalance },
    });

    let conversion;
    let attempts = 0;
    while (!conversion && attempts < 5) {
      try {
        conversion = await tx.rJRingConversion.create({
          data: {
            rjId: BigInt(rjId),
            displayCode: generateConversionCode(),
            ringsConverted: BigInt(rings),
            conversionRateApplied: conversionRate,
            amountCredited,
            ringsBalanceAfter: updatedWallet.ringsBalance,
            walletBalanceAfter: updatedWallet.balance,
          },
        });
      } catch (err) {
        if (err.code === "P2002") { attempts += 1; continue; } // displayCode collision — retry with a new one
        throw err;
      }
    }
    if (!conversion) throw new Error("DISPLAY_CODE_GENERATION_FAILED");

    await tx.rJRingTransaction.create({
      data: {
        rjId: BigInt(rjId),
        type: "conversion",
        rings: -BigInt(rings),
        ringsBalanceAfter: updatedWallet.ringsBalance,
        conversionId: conversion.id,
        description: `Converted to ₹${amountCredited.toFixed(2)}`,
      },
    });

    await tx.rJWalletTransaction.create({
      data: {
        rjId: BigInt(rjId),
        type: "ring_conversion",
        amount: amountCredited,
        balanceAfter: updatedWallet.balance,
        description: `${rings} rings converted`,
      },
    });

    return { conversion, wallet: updatedWallet };
  });
}

module.exports = {
  findWalletByRJId,
  listRingTransactions,
  listConversions,
  getOrCreateSetting,
  updateSetting,
  convertRings,
};