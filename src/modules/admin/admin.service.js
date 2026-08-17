const bcrypt = require("bcrypt");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS, BCRYPT_SALT_ROUNDS } = require("../../constants");
const repo = require("./admin.repository");

function serialize(admin) {
  return {
    publicId: admin.publicId,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role?.displayName || null,
    roleCode: admin.role?.code || null,
    status: admin.status,
    avatarUrl: admin.avatarUrl,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

async function createAdmin({ fullName, email, password, roleCode, avatarUrl, createdById }) {
  const role = await repo.findRoleByCode(roleCode);
  if (!role) throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown roleCode: ${roleCode}`);

  const existing = await repo.findByEmail(email);
  if (existing) throw new ApiError(HTTP_STATUS.CONFLICT, "An admin with this email already exists");

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const admin = await repo.createAdmin({
    fullName,
    email,
    passwordHash,
    roleId: role.id,
    avatarUrl: avatarUrl || null,
    status: "active",
    createdById: createdById ? BigInt(createdById) : null,
  });

  return serialize(admin);
}

async function listAdmins({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    repo.list({ skip, take: limit }),
    repo.count(),
  ]);

  return {
    items: items.map(serialize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getAdmin(publicId) {
  const admin = await repo.findByPublicId(publicId);
  if (!admin || admin.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");
  return serialize(admin);
}

async function updateAdmin(publicId, changes) {
  const existing = await repo.findByPublicId(publicId);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");

  const data = {};
  if (changes.fullName !== undefined) data.fullName = changes.fullName;
  if (changes.status !== undefined) data.status = changes.status;
  if (changes.avatarUrl !== undefined) data.avatarUrl = changes.avatarUrl;

  if (changes.roleCode !== undefined) {
    const role = await repo.findRoleByCode(changes.roleCode);
    if (!role) throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown roleCode: ${changes.roleCode}`);
    data.roleId = role.id;
  }

  const updated = await repo.updateById(existing.id, data);
  return serialize(updated);
}

async function changeOwnPassword({ adminId, currentPassword, newPassword }) {
  const admin = await repo.findByIdWithPassword(adminId);
  if (!admin) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");

  const matches = admin.passwordHash
    ? await bcrypt.compare(currentPassword, admin.passwordHash)
    : false;
  if (!matches) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await repo.updatePasswordAndRevokeSessions(admin.id, passwordHash);
}

// Super admin resets someone else's password — no current-password check needed.
async function resetAdminPassword({ publicId, newPassword }) {
  const target = await repo.findByPublicId(publicId);
  if (!target || target.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await repo.updatePasswordAndRevokeSessions(target.id, passwordHash);
}

async function deactivateAdmin(publicId) {
  const target = await repo.findByPublicId(publicId);
  if (!target || target.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");

  await repo.softDelete(target.id);
}

module.exports = {
  createAdmin,
  listAdmins,
  getAdmin,
  updateAdmin,
  changeOwnPassword,
  resetAdminPassword,
  deactivateAdmin,
};