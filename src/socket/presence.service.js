// src/socket/presence.service.js
//
// PresenceManager — the single source of truth for online/offline state.
// Both presence.socket.js (Socket.IO events) and modules/presence (REST API)
// call into this file; neither duplicates the logic.
//
// Design:
//  - In-memory Map is authoritative for "is this entity online right now" on
//    THIS instance. It correctly handles multiple simultaneous connections
//    per user/RJ/admin (phone + web, two tabs, etc.) by reference-counting
//    socket ids, and only fires an online/offline transition when the count
//    crosses 0 <-> 1.
//  - Upstash Redis (REST client, already used elsewhere in this project for
//    rate limiting) stores a mirrored `presence:<type>:<id>` key with a TTL,
//    refreshed on an interval while the entity is online. This is NOT used
//    for broadcasting (Upstash's REST client has no pub/sub — see
//    src/socket/io.js for why that means this deployment is single-instance
//    for now) — it exists purely as a crash-safety net: if this process dies
//    without running its disconnect handlers, the Redis key still expires on
//    its own instead of leaving a permanently "online" ghost.
//  - A short grace period is applied before finalizing an "offline" state, so
//    a page reload, brief network blip, or mobile app backgrounding doesn't
//    spam offline/online broadcasts. Socket.IO's own ping/pong still detects
//    genuinely dead connections; we're just debouncing the presence signal.
//  - DB writes only happen on actual online/offline transitions (not on every
//    ping), and reuse existing persistence:
//      - user -> User.lastActiveAt (already the field the admin panel's
//        isOnline() threshold check reads from — see users.service.js)
//      - rj   -> the existing rj/status module's recordHeartbeat/goOffline,
//        which already owns RJ.status, RJDeviceSession, and RJOfflineLog.
//        We do not touch those tables directly here.
//      - admin -> no persistence; presence is a live dashboard signal only.
//  - forceOnline()/forceOffline() below let a REST flow (login/logout) drive
//    presence directly, independent of the socket ref-count — see
//    src/modules/userAuth/userAuth.service.js, which calls forceOnline right
//    after issuing tokens and forceOffline on logout.
//  - forceOnline() is optimistic, not final: a login-grace watchdog
//    (LOGIN_GRACE_MS) auto-reverts to offline if no real socket connects in
//    time, so a crashed/force-quit app doesn't sit "online" indefinitely.
//    isOnlineSync() (this-instance-only, no Redis) reflects that distinction
//    for synchronous callers — e.g. serializing an RJ list — and is what
//    anything that needs "is this account actually reachable right now"
//    should read, not a raw lastActiveAt/logged-in check.

const { redis } = require("../config/redis");
const { prisma } = require("../config/database");
const statusService = require("../modules/rj/status/status.service");

const REDIS_TTL_SECONDS = 60;
const REDIS_REFRESH_MS = 25000; // well under the TTL, mirrors socket.io's default pingInterval
const OFFLINE_GRACE_MS = Number(process.env.PRESENCE_OFFLINE_GRACE_MS) || 5000;
// How long forceOnline() (login) will show an account as online before a
// real socket has to show up and prove it. Long enough for a normal app
// launch + handshake, short enough that a crashed/never-opened app doesn't
// sit "online" for the full Redis TTL with no broadcast telling anyone it
// dropped. See forceOnline()/connect() below.
const LOGIN_GRACE_MS = Number(process.env.PRESENCE_LOGIN_GRACE_MS) || 40000;

// key `${type}:${id}` -> { sockets: Set<socketId>, refreshTimer, offlineTimer, loginGraceTimer }
const entities = new Map();

function key(type, id) {
  return `${type}:${id}`;
}

// Lazy require to avoid the io.js <-> presence.socket.js <-> presence.service.js
// circular-require footgun: io.js requires presence.socket.js at load time,
// which requires this file at load time. If this file also required io.js at
// load time, io.js's module.exports wouldn't be populated yet. Requiring it
// only inside the function body (called well after startup) sidesteps that.
function getIOSafe() {
  try {
    return require("./io").getIO();
  } catch (_) {
    return null;
  }
}

async function connect(type, id, socketId) {
  const k = key(type, id);
  let entry = entities.get(k);
  if (!entry) {
    entry = { sockets: new Set(), refreshTimer: null, offlineTimer: null, loginGraceTimer: null };
    entities.set(k, entry);
  }

  // Cancel any pending "finalize offline" timer — this is a reconnect within
  // the grace window (or a second device connecting), not a fresh online.
  if (entry.offlineTimer) {
    clearTimeout(entry.offlineTimer);
    entry.offlineTimer = null;
  }

  // A real socket just proved this account is actually reachable — cancel
  // the login-grace watchdog forceOnline() may have started. It no longer
  // needs to guess; we know.
  if (entry.loginGraceTimer) {
    clearTimeout(entry.loginGraceTimer);
    entry.loginGraceTimer = null;
  }

  const wasOnline = entry.sockets.size > 0;
  entry.sockets.add(socketId);

  if (!wasOnline) {
    startRedisRefresh(entry, type, id);
    await markOnline(type, id);
  }
}

async function disconnect(type, id, socketId, reason) {
  const k = key(type, id);
  const entry = entities.get(k);
  if (!entry) return;

  entry.sockets.delete(socketId);
  if (entry.sockets.size > 0) return; // other devices/tabs still connected — stay online

  stopRedisRefresh(entry);
  // Normalize the socket.io disconnect reason to one of the RJ module's
  // OFFLINE_REASONS *here*, at the one call site that actually receives a raw
  // socket.io reason string — markOffline() takes an already-resolved reason
  // so forceOffline() (logout) can pass "logged_out" straight through
  // without it being second-guessed.
  const resolvedReason = reason === "client namespace disconnect" ? "logged_out" : "unexpected";
  entry.offlineTimer = setTimeout(() => {
    const current = entities.get(k);
    if (!current || current.sockets.size > 0) return; // reconnected during the grace window
    entities.delete(k);
    markOffline(type, id, resolvedReason).catch((err) =>
      console.error(`presence markOffline(${k}) failed:`, err.message)
    );
  }, OFFLINE_GRACE_MS);
}

function startRedisRefresh(entry, type, id) {
  const refresh = () =>
    redis.set(`presence:${type}:${id}`, "1", { ex: REDIS_TTL_SECONDS }).catch(() => {});
  refresh();
  entry.refreshTimer = setInterval(refresh, REDIS_REFRESH_MS);
}

function stopRedisRefresh(entry) {
  if (entry.refreshTimer) {
    clearInterval(entry.refreshTimer);
    entry.refreshTimer = null;
  }
}

async function markOnline(type, id) {
  try {
    if (type === "user") {
      await prisma.user.update({ where: { id: BigInt(id) }, data: { lastActiveAt: new Date() } });
    } else if (type === "rj") {
      // Reuses the existing heartbeat lifecycle (closes any open offline log,
      // flips RJ.status to "online" unless she's busy/on_call, logs activity)
      // instead of writing to rj.status directly.
      await statusService.recordHeartbeat(id, {});
    }
    // admin: nothing to persist
  } catch (err) {
    console.error(`presence markOnline(${type}:${id}) DB error:`, err.message);
  }
  await redis.set(`presence:${type}:${id}`, "1", { ex: REDIS_TTL_SECONDS }).catch(() => {});
  broadcast(type, id, "online");
}

async function markOffline(type, id, reason) {
  try {
    if (type === "user") {
      await prisma.user.update({ where: { id: BigInt(id) }, data: { lastActiveAt: new Date() } });
    } else if (type === "rj") {
      // `reason` is already one of the RJ module's OFFLINE_REASONS
      // ("logged_out" | "unexpected" | ...) by the time it reaches here —
      // see disconnect() and forceOffline(), the only two callers.
      await statusService.goOffline(id, reason || "unexpected");
    }
    // admin: nothing to persist
  } catch (err) {
    console.error(`presence markOffline(${type}:${id}) DB error:`, err.message);
  }
  await redis.del(`presence:${type}:${id}`).catch(() => {});
  broadcast(type, id, "offline");
}

// Broadcast scope is deliberately narrow, not global:
//  - the "admins" room (every connected admin dashboard socket)
//  - a `presence:<type>:<id>` room that any socket can opt into via the
//    presence:watch event (e.g. a User app watching a specific RJ's card)
// This avoids flooding every connected client with everyone else's presence,
// and never exposes anything beyond the minimum {id, role, status}.
function broadcast(type, id, status) {
  const io = getIOSafe();
  if (!io) return;

  const payload = { id: String(id), role: type.toUpperCase(), status, at: new Date().toISOString() };
  const room = `presence:${type}:${id}`;
  const eventName = status === "online" ? "presence:online" : "presence:offline";

  io.to("admins").emit("presence:update", payload);
  io.to(room).emit("presence:update", payload);
  io.to(room).emit(eventName, payload);
}

async function isOnline(type, id) {
  const entry = entities.get(key(type, id));
  if (entry && entry.sockets.size > 0) return true;

  // Fallback for a fresh/second instance that doesn't hold this in memory —
  // the Redis TTL key is the crash-safety net described above.
  try {
    const value = await redis.get(`presence:${type}:${id}`);
    return !!value;
  } catch (_) {
    return false;
  }
}

function listOnlineIds(type) {
  const prefix = `${type}:`;
  return Array.from(entities.entries())
    .filter(([k, v]) => k.startsWith(prefix) && v.sockets.size > 0)
    .map(([k]) => k.slice(prefix.length));
}

// Marks an account online immediately, independent of any socket connection.
// Used by the login flow (src/modules/userAuth) so a user/RJ shows as online
// the instant they log in, without waiting for the app to open a socket.
// If a real socket connects afterward, connect() will run its own (harmless,
// idempotent) markOnline — this just covers the gap between login and that.
async function forceOnline(type, id) {
  await markOnline(type, id);

  // Login only proves the account authenticated — it doesn't prove the app
  // is actually reachable (crash, dead network, force-quit right after OTP
  // verifies, etc). Start a watchdog: if no real socket connects within
  // LOGIN_GRACE_MS, walk the online state back ourselves. Without this, an
  // account that never opens a socket would sit "online" until the Redis
  // TTL silently expires — no broadcast, no DB revert, and (for RJs) she'd
  // stay marked available indefinitely. connect() cancels this the moment a
  // real socket shows up.
  const k = key(type, id);
  let entry = entities.get(k);
  if (!entry) {
    entry = { sockets: new Set(), refreshTimer: null, offlineTimer: null, loginGraceTimer: null };
    entities.set(k, entry);
  }

  if (entry.loginGraceTimer) clearTimeout(entry.loginGraceTimer);

  entry.loginGraceTimer = setTimeout(() => {
    const current = entities.get(k);
    if (!current || current.sockets.size > 0) return; // a real socket connected in time
    entities.delete(k);
    markOffline(type, id, "unexpected").catch((err) =>
      console.error(`presence login-grace markOffline(${k}) failed:`, err.message)
    );
  }, LOGIN_GRACE_MS);
}

// Synchronous, this-instance-only online check — no Redis round trip. Use
// this where an async check isn't practical (e.g. synchronously serializing
// a list of RJs for an admin/API response). It's authoritative for exactly
// what isOnline()'s in-memory branch is authoritative for: a real, currently
// connected socket on this instance. It intentionally does NOT count an
// account that only just called forceOnline() and hasn't opened a socket
// yet — see the module comment about why login alone isn't "online."
function isOnlineSync(type, id) {
  const entry = entities.get(key(type, id));
  return !!(entry && entry.sockets.size > 0);
}

// Marks an account offline immediately (e.g. on explicit logout), bypassing
// the socket ref-count and grace period used for normal disconnects. Also
// tears down any in-memory tracking AND disconnects any live socket(s) for
// that account — otherwise a still-connected socket's periodic Redis TTL
// refresh would silently undo this within ~25s, and isOnline() would keep
// reporting online from its in-memory check.
async function forceOffline(type, id, reason = "logged_out") {
  const k = key(type, id);
  const entry = entities.get(k);
  if (entry) {
    if (entry.offlineTimer) clearTimeout(entry.offlineTimer);
    if (entry.loginGraceTimer) clearTimeout(entry.loginGraceTimer);
    stopRedisRefresh(entry);
    entities.delete(k);
  }

  await markOffline(type, id, reason);

  const io = getIOSafe();
  if (io) {
    io.in(`${type}:${id}`).disconnectSockets(true);
  }
}

module.exports = {
  connect,
  disconnect,
  isOnline,
  isOnlineSync,
  listOnlineIds,
  forceOnline,
  forceOffline,
};