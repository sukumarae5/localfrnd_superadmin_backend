// src/modules/auth/auth.repository.js
const { prisma } = require("../../config/database");

function findAdminByEmail(email) {
  return prisma.admin.findUnique({
    where: { email },
    include: { role: true },
  });
}

function findAdminById(id) {
  return prisma.admin.findUnique({
    where: { id: BigInt(id) },
    include: { role: true },
  });
}

// Records every login attempt (success or failure) into admin_login_history
function logAttempt({ adminId, email, ipAddress, userAgent, isSuccess, failureReason }) {
  return prisma.adminLoginHistory.create({
    data: {
      adminId: adminId ?? null,
      attemptedEmail: email,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      isSuccess,
      failureReason: failureReason ?? null,
    },
  });
}

function incrementFailedAttempts(adminId, updatedAttempts, lockedUntil) {
  return prisma.admin.update({
    where: { id: adminId },
    data: {
      failedLoginAttempts: updatedAttempts,
      lockedUntil,
    },
  });
}

// Runs the "successful login" side effects atomically: reset failed attempts,
// stamp lastLoginAt/Ip, and create the new refresh-token session together.
function completeSuccessfulLogin({ adminId, ipAddress, session }) {
  return prisma.$transaction([
    prisma.admin.update({
      where: { id: adminId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    }),
    prisma.adminAuthSession.create({ data: session }),
  ]);
}

function findSessionByTokenHash(refreshTokenHash) {
  return prisma.adminAuthSession.findUnique({
    where: { refreshTokenHash },
    include: { admin: { include: { role: true } } },
  });
}

function revokeSessionsByTokenHash(refreshTokenHash) {
  return prisma.adminAuthSession.updateMany({
    where: { refreshTokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  findAdminByEmail,
  findAdminById,
  logAttempt,
  incrementFailedAttempts,
  completeSuccessfulLogin,
  findSessionByTokenHash,
  revokeSessionsByTokenHash,
};