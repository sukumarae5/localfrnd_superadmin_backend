// src/modules/auth/auth.service.js
const bcrypt = require("bcrypt");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../../utils/token.util");
const repo = require("./auth.repository");
const { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS, FAILURE_REASONS } = require("./auth.constants");

function serializeAdmin(admin) {
  return {
    id: admin.id.toString(),
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role?.displayName || null,
    avatarUrl: admin.avatarUrl,
  };
}

async function login({ email, password, ipAddress, userAgent }) {
  const admin = await repo.findAdminByEmail(email);

  if (!admin || admin.deletedAt) {
    await repo.logAttempt({
      adminId: null,
      email,
      ipAddress,
      userAgent,
      isSuccess: false,
      failureReason: FAILURE_REASONS.UNKNOWN_EMAIL,
    });
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
  }

  if (admin.status !== "active") {
    await repo.logAttempt({
      adminId: admin.id,
      email,
      ipAddress,
      userAgent,
      isSuccess: false,
      failureReason: FAILURE_REASONS.ACCOUNT_INACTIVE,
    });
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "This account is not active");
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    await repo.logAttempt({
      adminId: admin.id,
      email,
      ipAddress,
      userAgent,
      isSuccess: false,
      failureReason: FAILURE_REASONS.ACCOUNT_LOCKED,
    });
    throw new ApiError(
      HTTP_STATUS.LOCKED,
      "Account temporarily locked due to failed login attempts. Try again later."
    );
  }

  const passwordMatches = admin.passwordHash
    ? await bcrypt.compare(password, admin.passwordHash)
    : false;

  if (!passwordMatches) {
    await repo.logAttempt({
      adminId: admin.id,
      email,
      ipAddress,
      userAgent,
      isSuccess: false,
      failureReason: FAILURE_REASONS.INVALID_PASSWORD,
    });

    const updatedAttempts = admin.failedLoginAttempts + 1;
    const shouldLock = updatedAttempts >= MAX_FAILED_ATTEMPTS;

    await repo.incrementFailedAttempts(
      admin.id,
      updatedAttempts,
      shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : admin.lockedUntil
    );

    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
  }

  // --- success path ---
  await repo.logAttempt({
    adminId: admin.id,
    email,
    ipAddress,
    userAgent,
    isSuccess: true,
  });

  const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

  await repo.completeSuccessfulLogin({
    adminId: admin.id,
    ipAddress,
    session: {
      adminId: admin.id,
      refreshTokenHash: tokenHash,
      deviceInfo: userAgent?.slice(0, 200) || null,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  const accessToken = signAccessToken(admin);

  return { accessToken, rawRefreshToken: rawToken, admin: serializeAdmin(admin) };
}

async function refresh({ rawToken }) {
  if (!rawToken) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "No refresh token provided");

  const tokenHash = hashToken(rawToken);
  const session = await repo.findSessionByTokenHash(tokenHash);

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Refresh token is invalid or expired");
  }

  const accessToken = signAccessToken(session.admin);
  return { accessToken };
}

async function logout({ rawToken }) {
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await repo.revokeSessionsByTokenHash(tokenHash);
  }
}

async function me({ adminId }) {
  const admin = await repo.findAdminById(adminId);
  if (!admin || admin.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");

  return {
    ...serializeAdmin(admin),
    themePreference: admin.themePreference,
  };
}

module.exports = { login, refresh, logout, me };