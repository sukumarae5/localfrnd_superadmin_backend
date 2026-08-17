const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./activity.repository");

function serializeLog(l) {
  return {
    id: l.id.toString(),
    user: { fullName: l.user.fullName, displayCode: l.user.displayCode, avatarUrl: l.user.avatarUrl },
    activityType: l.activityType.label,
    activityCode: l.activityType.code,
    deviceInfo: l.deviceInfo,
    ipAddress: l.ipAddress,
    location: l.location,
    riskLevel: l.riskLevel,
    createdAt: l.createdAt,
  };
}

function serializeSession(s) {
  return {
    id: s.id.toString(),
    user: { fullName: s.user.fullName, displayCode: s.user.displayCode, avatarUrl: s.user.avatarUrl },
    deviceInfo: s.deviceInfo,
    platform: s.platform,
    os: s.os,
    ipAddress: s.ipAddress,
    location: s.location,
    isActive: s.isActive,
    startedAt: s.startedAt,
    lastSeenAt: s.lastSeenAt,
    endedAt: s.endedAt,
  };
}

async function getStats() {
  return repo.getStats();
}

async function getLiveFeed(limit) {
  const logs = await repo.getLiveFeed(limit);
  return logs.map(serializeLog);
}

async function listLogs(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { logs, total } = await repo.listLogs({
    page, limit,
    search: query.search,
    activityTypeCode: query.activityType,
    riskLevel: query.riskLevel,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
  });

  return { logs: logs.map(serializeLog), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function listSessions(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { sessions, total } = await repo.listSessions({
    userId: query.userId,
    isActive: query.isActive === undefined ? undefined : query.isActive === "true" || query.isActive === true,
    page, limit,
  });

  return { sessions: sessions.map(serializeSession), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function endSession(id) {
  const session = await repo.findSessionById(id);
  if (!session) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Session not found");
  if (!session.isActive) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Session is already ended");

  const updated = await repo.endSession(id);
  return { id: updated.id.toString(), isActive: updated.isActive, endedAt: updated.endedAt };
}

module.exports = { getStats, getLiveFeed, listLogs, listSessions, endSession };