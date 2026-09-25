// src/utils/resolveActorType.util.js
//
// Single place that answers "is this User account also an RJ?" — reused by
// src/socket/socketAuth.middleware.js and by the login/logout flow in
// src/modules/userAuth, so the rule (RJ = a User row with a non-deleted RJ
// profile) is defined exactly once instead of duplicated.
const { prisma } = require("../config/database");

/**
 * @param {string|bigint|number} userId
 * @returns {Promise<{ type: "user" } | { type: "rj", rjId: string }>}
 */
async function resolveActorType(userId) {
  const rj = await prisma.rJ.findUnique({
    where: { userId: BigInt(userId) },
    select: { id: true, deletedAt: true },
  });

  if (rj && !rj.deletedAt) {
    return { type: "rj", rjId: String(rj.id) };
  }
  return { type: "user" };
}

module.exports = { resolveActorType };