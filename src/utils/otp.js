const crypto = require("crypto");

/**
 * Generates a numeric OTP of the given length using crypto-secure randomness.
 * Avoids Math.random() since OTPs are a security-sensitive value.
 */
const generateOtp = (length = 6) => {
  const digits = "0123456789";
  const bytes = crypto.randomBytes(length);
  let otp = "";
  for (let i = 0; i < length; i += 1) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};

module.exports = { generateOtp };