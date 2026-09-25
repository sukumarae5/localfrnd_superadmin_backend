const repo = require("../modules/calls/calls.repository");
const { BILLING_INTERVAL_MS, END_REASONS } = require("../modules/calls/calls.constants");

const activeTimers = new Map();

async function billOneTick(io, session) {
  const { userId, rjId, coinRatePerMinute, rjEarnRatePerMinute, id: sessionId, publicId } = session;

  let updatedWallet;
  try {
    updatedWallet = await repo.debitCallCoins({ userId, rate: coinRatePerMinute, sessionPublicId: publicId });
  } catch (err) {
    stopBilling(publicId);
    const callsService = require("../modules/calls/calls.service");
    await callsService.endCall(publicId, "system", END_REASONS.INSUFFICIENT_COINS);
    return;
  }

  const updatedRJWallet = await repo.creditRJRingEarning({ rjId, rings: rjEarnRatePerMinute, sessionId });

  await repo.incrementSessionTotals(sessionId, { coinsSpentDelta: coinRatePerMinute, earningsAmountDelta: rjEarnRatePerMinute });

  io.to(`user:${userId}`).emit("call:billing-tick", { sessionPublicId: publicId, coinsDeducted: coinRatePerMinute, coinsRemaining: updatedWallet.coins.toString() });
  io.to(`rj:${rjId}`).emit("call:billing-tick", { sessionPublicId: publicId, ringsCredited: rjEarnRatePerMinute, ringsBalance: updatedRJWallet.ringsBalance.toString() });
}

function startBilling(io, session) {
  if (activeTimers.has(session.publicId)) return;
  const timer = setInterval(() => {
    billOneTick(io, session).catch((err) => console.error(`call billing tick failed for session ${session.publicId}:`, err.message));
  }, BILLING_INTERVAL_MS);
  activeTimers.set(session.publicId, timer);
}

function stopBilling(sessionPublicId) {
  const timer = activeTimers.get(sessionPublicId);
  if (timer) { clearInterval(timer); activeTimers.delete(sessionPublicId); }
}

module.exports = { startBilling, stopBilling };