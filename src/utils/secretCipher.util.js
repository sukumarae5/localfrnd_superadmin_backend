// src/utils/secretCipher.util.js
//
// AES-256-GCM helper for storing gateway API keys / webhook secrets at
// rest. Requires GATEWAY_SECRET_ENCRYPTION_KEY in .env -- a 32-byte key,
// base64-encoded (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const raw = process.env.GATEWAY_SECRET_ENCRYPTION_KEY;

  console.log("========== GATEWAY ENCRYPTION KEY DEBUG ==========");
  console.log("KEY EXISTS:", !!raw);
  console.log("KEY LENGTH:", raw ? raw.length : "MISSING");
  console.log(
    "DECODED LENGTH:",
    raw ? Buffer.from(raw, "base64").length : "MISSING"
  );
  console.log("===================================================");

  if (!raw) {
    throw new Error(
      "GATEWAY_SECRET_ENCRYPTION_KEY is not set in the environment"
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      "GATEWAY_SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
  }

  return key;
}

// Returns "iv:authTag:ciphertext", all base64, colon-joined so it's a
// single opaque string safe to store in a String column.
function encryptSecret(plaintext) {
  if (!plaintext) return null;

  const key = getKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

function decryptSecret(encrypted) {
  if (!encrypted) return null;

  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

// For displaying in the admin UI without ever sending the real secret
// back to the browser -- shows only the last 4 characters.
function maskSecret(plaintext) {
  if (!plaintext) return null;
  const str = String(plaintext);
  if (str.length <= 4) return "*".repeat(str.length);
  return "*".repeat(str.length - 4) + str.slice(-4);
}

module.exports = { encryptSecret, decryptSecret, maskSecret };
