const { prisma } = require("../../config/database");

// ----------------------------------------------------------------------------
// Lookups
// ----------------------------------------------------------------------------

function findAvailableRJ(rjId) {
  return prisma.rJ.findUnique({
    where: { id: BigInt(rjId) },
    select: { id: true, userId: true, status: true, deletedAt: true },
  });
}

function findUserBasic(userId) {
  return prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { id: true, fullName: true, avatarUrl: true, deletedAt: true, status: true },
  });
}

function findUserLocation(userId) {
  return prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { city: true, state: true, country: true },
  });
}

function findRJBasic(rjId) {
  return prisma.rJ.findUnique({
    where: { id: BigInt(rjId) },
    select: { id: true, status: true, user: { select: { fullName: true, avatarUrl: true } } },
  });
}

// Full location + eligibility snapshot for a single RJ — used by the direct
// and local call paths to validate a specific target before ringing her.
function findRJForCallTarget(rjId) {
  return prisma.rJ.findUnique({
    where: { id: BigInt(rjId) },
    select: {
      id: true, status: true, deletedAt: true,
      user: { select: { id: true, fullName: true, avatarUrl: true, status: true, city: true, state: true, country: true } },
    },
  });
}

// Bulk location lookup for a batch of RJ ids pulled off the random queue —
// used by Local Call to filter the FIFO queue down to same-location
// candidates without a DB round trip per candidate.
function findRJsLocationByIds(rjIds) {
  return prisma.rJ.findMany({
    where: { id: { in: rjIds.map((id) => BigInt(id)) } },
    select: { id: true, user: { select: { city: true, state: true, country: true } } },
  });
}

// "Available RJs" list for the Direct Call picker. Mirrors the existing
// online-RJ-listing convention (deletedAt: null, status != offline) from
// status.repository.js — 'busy' (searching) still shows up here because a
// search in progress does not block a direct call per the product rule.
function listAvailableRJsForDirect({ callType, city, state, country, page, limit }) {
  const where = { deletedAt: null, status: { in: ["online", "busy"] } };
  if (city) where.user = { ...(where.user || {}), city: { equals: city, mode: "insensitive" } };
  if (state) where.user = { ...(where.user || {}), state: { equals: state, mode: "insensitive" } };
  if (country) where.user = { ...(where.user || {}), country: { equals: country, mode: "insensitive" } };

  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.rJ.findMany({
      where, skip, take: limit, orderBy: { lastActiveAt: "desc" },
      select: {
        id: true, status: true, avgRating: true,
        user: { select: { fullName: true, avatarUrl: true, city: true, state: true, country: true } },
      },
    }),
    prisma.rJ.count({ where }),
  ]);
}

function findActiveSessionForUser(userId) {
  return prisma.rJCallSession.findFirst({ where: { userId: BigInt(userId), status: "ongoing" } });
}

function findActiveSessionForRJ(rjId) {
  return prisma.rJCallSession.findFirst({ where: { rjId: BigInt(rjId), status: "ongoing" } });
}

// "Active OR pending" — used for idempotency checks and for guarding a
// second direct call from landing on someone already mid-ring/mid-call.
function findActiveOrRingingSessionForUser(userId) {
  return prisma.rJCallSession.findFirst({
    where: { userId: BigInt(userId), status: { in: ["ringing", "ongoing"] } },
    orderBy: { startedAt: "desc" },
  });
}

function findActiveOrRingingSessionForRJ(rjId) {
  return prisma.rJCallSession.findFirst({
    where: { rjId: BigInt(rjId), status: { in: ["ringing", "ongoing"] } },
    orderBy: { startedAt: "desc" },
  });
}

function findSessionByPublicId(publicId) {
  return prisma.rJCallSession.findUnique({ where: { publicId } });
}

function findSessionById(id) {
  return prisma.rJCallSession.findUnique({ where: { id: BigInt(id) } });
}

// ----------------------------------------------------------------------------
// Admin call history / monitoring
// ----------------------------------------------------------------------------

function buildAdminWhere({ rjId, userId, status, callType, callMode, dateFrom, dateTo }) {
  const where = {};
  if (rjId) where.rjId = BigInt(rjId);
  if (userId) where.userId = BigInt(userId);
  if (status) where.status = status;
  if (callType) where.callType = callType;
  if (callMode) where.callMode = callMode;
  if (dateFrom || dateTo) {
    where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
  }
  return where;
}

async function adminListCalls({ page, limit, rjId, userId, status, callType, callMode, dateFrom, dateTo }) {
  const where = buildAdminWhere({ rjId, userId, status, callType, callMode, dateFrom, dateTo });
  const skip = (page - 1) * limit;

  const [calls, total] = await prisma.$transaction([
    prisma.rJCallSession.findMany({
      where, skip, take: limit, orderBy: { startedAt: "desc" },
      include: {
        rj: { select: { displayCode: true, user: { select: { fullName: true } } } },
        user: { select: { displayCode: true, fullName: true } },
      },
    }),
    prisma.rJCallSession.count({ where }),
  ]);

  return { calls, total };
}

function adminGetCallDetail(publicId) {
  return prisma.rJCallSession.findUnique({
    where: { publicId },
    include: {
      rj: { select: { displayCode: true, user: { select: { fullName: true, avatarUrl: true } } } },
      user: { select: { displayCode: true, fullName: true, avatarUrl: true } },
      review: true,
    },
  });
}

async function adminForceEndSession({ sessionId, rjId, durationSecs }) {
  return endSession({ sessionId, rjId, durationSecs, endReason: "admin_force_end" });
}

// ----------------------------------------------------------------------------
// Session lifecycle
// ----------------------------------------------------------------------------

async function createSession({ rjId, userId, callType, callMode, coinRatePerMinute, rjEarnRatePerMinute }) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.rJCallSession.create({
      data: { rjId: BigInt(rjId), userId: BigInt(userId), status: "ongoing", callType, callMode, coinRatePerMinute, rjEarnRatePerMinute },
    });
    await tx.rJ.update({ where: { id: BigInt(rjId) }, data: { status: "on_call", lastActiveAt: new Date() } });
    return session;
  });
}

// Direct/local calls create the row immediately in `ringing` — before
// anyone has accepted — so a rejected/missed/cancelled direct call still
// shows up in admin history (unlike random matching, which never creates a
// row until both sides are actually connected).
function createRingingSession({ rjId, userId, callType, callMode, coinRatePerMinute, rjEarnRatePerMinute }) {
  return prisma.rJCallSession.create({
    data: { rjId: BigInt(rjId), userId: BigInt(userId), status: "ringing", callType, callMode, coinRatePerMinute, rjEarnRatePerMinute },
  });
}

// Ringing -> ongoing (RJ accepted). Guarded by a conditional update (only
// transitions rows still in 'ringing') so two near-simultaneous accept taps
// can't both succeed — the second gets affected=0 and the service treats
// that as "already handled" rather than double-billing/double-notifying.
async function acceptRingingSession(sessionId, rjId) {
  return prisma.$transaction(async (tx) => {
    const affected = await tx.$executeRaw`
      UPDATE rj_call_sessions
      SET status = 'ongoing', started_at = NOW()
      WHERE id = ${BigInt(sessionId)} AND status = 'ringing'
    `;
    if (affected === 0) throw new Error("SESSION_NOT_RINGING");

    const session = await tx.rJCallSession.findUnique({ where: { id: BigInt(sessionId) } });
    await tx.rJ.update({ where: { id: BigInt(rjId) }, data: { status: "on_call", lastActiveAt: new Date() } });
    return session;
  });
}

// Ringing -> rejected/cancelled/missed. Also guarded — only transitions rows
// still in 'ringing', so this can't stomp on a call that got accepted a
// moment earlier.
async function endRingingSession(sessionId, status, endReason) {
  const affected = await prisma.$executeRaw`
    UPDATE rj_call_sessions
    SET status = ${status}::"call_status", ended_at = NOW(), duration_secs = 0, end_reason = ${endReason}
    WHERE id = ${BigInt(sessionId)} AND status = 'ringing'
  `;
  if (affected === 0) return null; // already accepted/ended by the time this ran
  return prisma.rJCallSession.findUnique({ where: { id: BigInt(sessionId) } });
}

async function endSession({ sessionId, rjId, durationSecs, endReason, quality }) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.rJCallSession.update({
      where: { id: BigInt(sessionId) },
      data: { status: "completed", endedAt: new Date(), durationSecs, endReason, ...(quality ? { quality } : {}) },
    });
    await tx.rJ.update({ where: { id: BigInt(rjId) }, data: { status: "online", lastActiveAt: new Date() } });
    return session;
  });
}

function markMissed(sessionId, endReason) {
  return prisma.rJCallSession.update({ where: { id: BigInt(sessionId) }, data: { status: "missed", endedAt: new Date(), endReason } });
}

function incrementSessionTotals(sessionId, { coinsSpentDelta, earningsAmountDelta }) {
  return prisma.rJCallSession.update({
    where: { id: BigInt(sessionId) },
    data: { coinsSpent: { increment: coinsSpentDelta }, earningsAmount: { increment: earningsAmountDelta } },
  });
}

// ----------------------------------------------------------------------------
// Billing — one tick of per-minute deduction/credit
// ----------------------------------------------------------------------------

async function debitCallCoins({ userId, rate, sessionPublicId }) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.userWallet.findUnique({ where: { userId: BigInt(userId) } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");
    if (wallet.isFrozen) throw new Error("WALLET_FROZEN");

    const affected = await tx.$executeRaw`
      UPDATE user_wallets SET coins = coins - ${rate} WHERE user_id = ${BigInt(userId)} AND coins >= ${rate}
    `;
    if (affected === 0) throw new Error("INSUFFICIENT_COINS");

    const updated = await tx.userWallet.findUnique({ where: { userId: BigInt(userId) } });

    await tx.walletTransaction.create({
      data: { userId: BigInt(userId), type: "debit", status: "completed", amount: 0, coins: rate, balanceAfter: updated.balance, description: "Call charge", referenceId: sessionPublicId },
    });

    return updated;
  });
}

// Every billing tick credits RINGS, not rupees — rupees only enter
// RJWallet.balance when the RJ manually converts (see rj/rings module).
// Flat rate regardless of call type, matching the legacy app's
// FEMALE_EARN_RATE behavior (rjEarnRatePerMinute on the session IS that rate).
async function creditRJRingEarning({ rjId, rings, sessionId }) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.rJWallet.findUnique({ where: { rjId: BigInt(rjId) } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    const newRingsBalance = wallet.ringsBalance + BigInt(rings);
    const updatedWallet = await tx.rJWallet.update({
      where: { rjId: BigInt(rjId) },
      data: { ringsBalance: newRingsBalance },
    });

    await tx.rJRingTransaction.create({
      data: {
        rjId: BigInt(rjId),
        type: "call_earning",
        rings: BigInt(rings),
        ringsBalanceAfter: updatedWallet.ringsBalance,
        callSessionId: BigInt(sessionId),
        description: "Call earning",
      },
    });

    return updatedWallet;
  });
}

// ----------------------------------------------------------------------------
// Call history (for the User/RJ apps, not the admin dashboard's adminListCalls
// above) — "after a call connects, both sides can see it in their history."
// ----------------------------------------------------------------------------

const HISTORY_LIST_SELECT = {
  id: true, publicId: true, status: true, callType: true, callMode: true,
  startedAt: true, endedAt: true, durationSecs: true, coinsSpent: true, endReason: true,
};

function listUserCallHistory(userId, { page, limit }) {
  const where = { userId: BigInt(userId) };
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.rJCallSession.findMany({
      where, skip, take: limit, orderBy: { startedAt: "desc" },
      // rj.user.id (not just rj.id) is required here — the friends/chat
      // layer only knows the RJ's underlying User.id (see social.prisma),
      // so a "send friend request from call history" action needs it.
      select: { ...HISTORY_LIST_SELECT, rj: { select: { id: true, user: { select: { id: true, fullName: true, avatarUrl: true } } } } },
    }),
    prisma.rJCallSession.count({ where }),
  ]);
}

function listRJCallHistory(rjId, { page, limit }) {
  const where = { rjId: BigInt(rjId) };
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.rJCallSession.findMany({
      where, skip, take: limit, orderBy: { startedAt: "desc" },
      select: { ...HISTORY_LIST_SELECT, user: { select: { id: true, fullName: true, avatarUrl: true } } },
    }),
    prisma.rJCallSession.count({ where }),
  ]);
}

// Most recent call session per counterpart — `distinct` combined with
// `orderBy` gives Postgres DISTINCT ON semantics via Prisma (one row per
// distinct rjId/userId, keeping the first row of each group by startedAt
// desc), so this needs no raw SQL / window function.
function listUserRecentContacts(userId) {
  return prisma.rJCallSession.findMany({
    where: { userId: BigInt(userId) },
    orderBy: { startedAt: "desc" },
    distinct: ["rjId"],
    // Same reasoning as listUserCallHistory above: rj.user.id is what the
    // friends/chat layer actually needs, not just her rj.id.
    select: { ...HISTORY_LIST_SELECT, rj: { select: { id: true, user: { select: { id: true, fullName: true, avatarUrl: true } } } } },
  });
}

function listRJRecentContacts(rjId) {
  return prisma.rJCallSession.findMany({
    where: { rjId: BigInt(rjId) },
    orderBy: { startedAt: "desc" },
    distinct: ["userId"],
    select: { ...HISTORY_LIST_SELECT, user: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
}

// Takes the counterpart's User.id (not her RJ.id) — deliberately, so a
// client can reuse the exact same id it already has from the friends/chat
// list (both keyed on User.id, see social.prisma) to pull up call history
// with that same person, instead of needing to separately track her rjId.
function listUserHistoryWithRJ(userId, counterpartUserId, { page, limit }) {
  const where = { userId: BigInt(userId), rj: { userId: BigInt(counterpartUserId) } };
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.rJCallSession.findMany({ where, skip, take: limit, orderBy: { startedAt: "desc" }, select: HISTORY_LIST_SELECT }),
    prisma.rJCallSession.count({ where }),
  ]);
}

function listRJHistoryWithUser(rjId, userId, { page, limit }) {
  const where = { rjId: BigInt(rjId), userId: BigInt(userId) };
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.rJCallSession.findMany({ where, skip, take: limit, orderBy: { startedAt: "desc" }, select: HISTORY_LIST_SELECT }),
    prisma.rJCallSession.count({ where }),
  ]);
}

module.exports = {
  findAvailableRJ, findUserBasic, findUserLocation, findRJBasic, findRJForCallTarget, findRJsLocationByIds,
  listAvailableRJsForDirect, findActiveSessionForUser, findActiveSessionForRJ,
  findActiveOrRingingSessionForUser, findActiveOrRingingSessionForRJ,
  findSessionByPublicId, findSessionById, createSession, createRingingSession,
  acceptRingingSession, endRingingSession, endSession, markMissed, incrementSessionTotals,
  debitCallCoins, creditRJRingEarning, adminListCalls, adminGetCallDetail, adminForceEndSession,
  listUserCallHistory, listRJCallHistory, listUserRecentContacts, listRJRecentContacts,
  listUserHistoryWithRJ, listRJHistoryWithUser,
};