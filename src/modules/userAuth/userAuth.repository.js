const { randomUUID } = require("crypto");
// Matches your src/config/database.js, which exports { prisma, connectDB, disconnectDB }
const { prisma } = require("../../config/database");

/**
 * Uses the compound unique constraint `uq_users_mobile` defined on
 * (mobileCountryCode, mobileNumber) in your schema.
 */
const findUserByMobile = (mobileCountryCode, mobileNumber) => {
  return prisma.user.findUnique({
    where: { uq_users_mobile: { mobileCountryCode, mobileNumber } },
  });
};

/**
 * Generates a unique LF- display code, retrying on the rare collision.
 */
const generateUniqueDisplayCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `LF-${Math.floor(10000 + Math.random() * 90000)}`;
    const exists = await prisma.user.findUnique({
      where: { displayCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique display code, please retry");
};

/**
 * Creates a brand-new user on first OTP verification. `fullName` is left
 * unset — this schema change (making it nullable) is required; see README.
 * The app should prompt for profile completion afterwards.
 */
const createUser = async (mobileCountryCode, mobileNumber) => {
  try {
    console.log("Creating user in database...");

    const displayCode = await generateUniqueDisplayCode();

    const user = await prisma.user.create({
      data: {
        mobileCountryCode,
        mobileNumber,
        publicId: randomUUID(),
        displayCode,
        status: "active",
      },
    });

    console.log("User created:", user);

    return user;
  } catch (err) {
    console.error("CREATE USER ERROR");
    console.error(err);
    throw err;
  }
};

const markLogin = (userId) => {
  const now = new Date();
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: now, lastActiveAt: now },
  });
};

/**
 * Reuses your existing UserSession model (already built for the User
 * Activity screen) to also carry the hashed refresh token for this login,
 * instead of introducing a second, overlapping sessions table.
 * Requires `refreshTokenHash` and `expiresAt` columns — see README diff.
 */
const createUserSession = async (data) => {
  try {
    console.log("Creating session...");

    const session = await prisma.userSession.create({
      data,
    });

    console.log("Session created:", session);

    return session;
  } catch (err) {
    console.error("SESSION ERROR");
    console.error(err);
    throw err;
  }
};

module.exports = {
  findUserByMobile,
  createUser,
  markLogin,
  createUserSession,
};