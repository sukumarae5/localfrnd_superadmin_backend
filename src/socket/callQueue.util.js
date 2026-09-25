
const { redis } = require("../config/redis");
const { REDIS_KEYS, SEARCH_TTL_SECONDS } = require("../modules/calls/calls.constants");

const MAX_POP_ATTEMPTS = 10;

function queueKeyFor(actorType, callType) {
  return actorType === "rj" ? REDIS_KEYS.rjQueue(callType) : REDIS_KEYS.userQueue(callType);
}
function markerKeyFor(actorType, actorId) {
  return actorType === "rj" ? REDIS_KEYS.rjSearching(actorId) : REDIS_KEYS.userSearching(actorId);
}

async function enqueueWaiting(actorType, actorId, callType) {
  const id = String(actorId);
  const queueKey = queueKeyFor(actorType, callType);
  const markerKey = markerKeyFor(actorType, actorId);
  await redis.lrem(queueKey, 0, id);
  await redis.lpush(queueKey, id);
  await redis.set(markerKey, callType, { ex: SEARCH_TTL_SECONDS });
}

async function dequeueWaiting(actorType, callType) {
  const queueKey = queueKeyFor(actorType, callType);
  for (let attempt = 0; attempt < MAX_POP_ATTEMPTS; attempt += 1) {
    const actorId = await redis.rpop(queueKey);
    if (!actorId) return null;
    const markerKey = markerKeyFor(actorType, actorId);
    const markedType = await redis.get(markerKey);
    if (markedType === callType) {
      await redis.del(markerKey);
      return String(actorId);
    }
  }
  return null;
}

async function cancelWaiting(actorType, actorId, callType) {
  const queueKey = queueKeyFor(actorType, callType);
  const markerKey = markerKeyFor(actorType, actorId);
  await redis.lrem(queueKey, 0, String(actorId));
  await redis.del(markerKey);
}

async function isSearching(actorType, actorId) {
  const markerKey = markerKeyFor(actorType, actorId);
  const markedType = await redis.get(markerKey);
  return markedType || null;
}

async function peekWaitingOldestFirst(actorType, callType) {
  const queueKey = queueKeyFor(actorType, callType);
  const members = await redis.lrange(queueKey, 0, -1);
  return members.map(String).reverse();
}


async function claimWaiting(actorType, actorId, callType) {
  const queueKey = queueKeyFor(actorType, callType);
  const markerKey = markerKeyFor(actorType, actorId);

  const markedType = await redis.get(markerKey);
  if (markedType !== callType) return false;

  const removed = await redis.lrem(queueKey, 0, String(actorId));
  if (removed === 0) return false;

  await redis.del(markerKey);
  return true;
}

module.exports = { enqueueWaiting, dequeueWaiting, cancelWaiting, isSearching, peekWaitingOldestFirst, claimWaiting };
