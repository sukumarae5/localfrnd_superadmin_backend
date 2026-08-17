// src/constants/index.js

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  LOCKED: 423,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// Mirrors the `code` values you seed into admin_roles (see prisma/seed.js)
const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SUPPORT: "support",
};

const BCRYPT_SALT_ROUNDS = 12;

module.exports = { HTTP_STATUS, ADMIN_ROLES, BCRYPT_SALT_ROUNDS };
