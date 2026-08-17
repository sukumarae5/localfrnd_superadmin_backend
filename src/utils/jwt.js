// src/utils/jwt.js
// Thin wrapper around jsonwebtoken so the rest of the app never imports
// "jsonwebtoken" directly — keeps token.util.js focused on domain logic
// (access vs refresh tokens) instead of library details.
const jwt = require("jsonwebtoken");

function sign(payload, secret, options = {}) {
  return jwt.sign(payload, secret, options);
}

function verify(token, secret) {
  return jwt.verify(token, secret); // throws JsonWebTokenError / TokenExpiredError
}

function decode(token) {
  return jwt.decode(token);
}

module.exports = { sign, verify, decode };