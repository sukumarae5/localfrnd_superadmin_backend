// ASSUMPTION: this is the same Upstash Redis REST client instance you already
// use for the login rate limiter. Adjust the import path if different.
const {redis} = require("../../config/redis");
const { generateOtp } = require("../../utils/otp");
const ApiError = require("../../utils/apiError.util");
const { signUserAccessToken, generateUserRefreshToken } = require("../../utils/userAuthToken.util");
const { HTTP_STATUS } = require("../../constants");
const repository = require("./userAuth.repository");

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute between sends
const MAX_VERIFY_ATTEMPTS = 5;

// mobileCountryCode + mobileNumber together form the identity for OTP purposes,
// matching the `uq_users_mobile` compound unique constraint on User.
const identity = (mobileCountryCode, mobileNumber) => `${mobileCountryCode}${mobileNumber}`;

const keys = {
  otp: (id) => `otp:${id}`,
  cooldown: (id) => `otp:cooldown:${id}`,
  attempts: (id) => `otp:attempts:${id}`,
};

/**
 * Generates and "sends" an OTP. For now this logs the OTP to the console
 * instead of calling Twilio — swap the console.log for an actual SMS send
 * once that's wired up, the rest of the flow won't change.
 */
const sendOtp = async (mobileCountryCode, mobileNumber) => {
  const id = identity(mobileCountryCode, mobileNumber);

  const onCooldown = await redis.get(keys.cooldown(id));
  if (onCooldown) {
    const ttl = await redis.ttl(keys.cooldown(id));
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      `Please wait ${ttl}s before requesting another OTP`
    );
  }

  const otp = generateOtp(OTP_LENGTH);

  // Upstash REST client syntax: redis.set(key, value, { ex: seconds })
  await redis.set(keys.otp(id), otp, { ex: OTP_TTL_SECONDS });
  await redis.set(keys.cooldown(id), "1", { ex: RESEND_COOLDOWN_SECONDS });
  await redis.del(keys.attempts(id));

  // TODO: replace with Twilio SMS send. Gate this log behind
  // NODE_ENV !== 'production' once Twilio is wired in.
  // eslint-disable-next-line no-console
  console.log(
    `[OTP] mobile=${mobileCountryCode}${mobileNumber} otp=${otp} expiresIn=${OTP_TTL_SECONDS}s`
  );

  return { mobileCountryCode, mobileNumber, expiresInSeconds: OTP_TTL_SECONDS };
};

/**
 * Pulls basic device/platform info from request headers. Native mobile apps
 * typically send custom headers rather than a browser user-agent — ADJUST
 * these header names (`x-platform`, `x-device-os`, `x-device-model`) to
 * whatever your actual mobile app sends. Falls back to user-agent parsing
 * only for the raw deviceInfo string.
 */
const extractDeviceMeta = (req) => ({
  deviceInfo: req.headers["x-device-model"] || req.headers["user-agent"] || null,
  platform: req.headers["x-platform"] || null, // e.g. "Mobile App"
  os: req.headers["x-device-os"] || null, // e.g. "iOS 17"
  ipAddress: req.ip,
  location: null, // populate via IP geolocation later if needed
});

/**
 * Verifies the OTP and either registers a new user or logs in an existing
 * one, issuing an access + refresh token pair either way.
 */
const verifyOtp = async (mobileCountryCode, mobileNumber, submittedOtp, deviceMeta = {}) => {
  try {
    const id = identity(mobileCountryCode, mobileNumber);

    console.log("1. Identity:", id);

    const storedOtp = await redis.get(keys.otp(id));

   console.log("Stored OTP:", storedOtp, typeof storedOtp);
console.log("Submitted OTP:", submittedOtp, typeof submittedOtp);

console.log("Equal (===):", storedOtp === submittedOtp);
console.log("Equal (!==):", storedOtp !== submittedOtp);
console.log("Stored length:", String(storedOtp).length);
console.log("Submitted length:", String(submittedOtp).length);
    if (!storedOtp) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "OTP expired or not requested."
      );
    }

    if (String(storedOtp) !== String(submittedOtp)) {
  await redis.incr(keys.attempts(id));
  await redis.expire(keys.attempts(id), OTP_TTL_SECONDS);

  throw new ApiError(
    HTTP_STATUS.BAD_REQUEST,
    "Incorrect OTP"
  );
}

    console.log("4. OTP verified");

    await redis.del(keys.otp(id));
    await redis.del(keys.attempts(id));
    await redis.del(keys.cooldown(id));

    console.log("5. Searching user");

    let user = await repository.findUserByMobile(
      mobileCountryCode,
      mobileNumber
    );

    console.log("6. User:", user);

    let isNewUser = false;

    if (!user) {
      console.log("7. Creating user");

      user = await repository.createUser(
        mobileCountryCode,
        mobileNumber
      );

      console.log("8. User created:", user);

      isNewUser = true;
    } else {
      console.log("9. Existing user");

      user = await repository.markLogin(user.id);
    }

    console.log("10. Creating access token");

    const accessToken = signUserAccessToken(user);

    console.log("11. Creating refresh token");

    const {
      rawToken: refreshToken,
      tokenHash,
      expiresAt,
    } = generateUserRefreshToken();

    console.log("12. Creating session");

    await repository.createUserSession({
      userId: user.id,
      refreshTokenHash: tokenHash,
      expiresAt,
      deviceInfo: deviceMeta.deviceInfo,
      platform: deviceMeta.platform,
      os: deviceMeta.os,
      ipAddress: deviceMeta.ipAddress,
      location: deviceMeta.location,
    });

    console.log("13. Finished");

    return {
      user,
      isNewUser,
      accessToken,
      refreshToken,
    };
  } catch (err) {
    console.error("VERIFY OTP ERROR");
    console.error(err);
    throw err;
  }
};

module.exports = { sendOtp, verifyOtp, extractDeviceMeta };