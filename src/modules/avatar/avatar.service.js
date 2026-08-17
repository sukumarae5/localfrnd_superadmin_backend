const crypto = require("crypto");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const { CLOUDINARY_AVATAR_FOLDER } = require("./avatar.constants");
const cloudinaryBuffer = require("../../utils/cloudinaryBuffer.util");
const repo = require("./avatar.repository");

function serializeAvatar(a) {
  return {
    id: a.id,
    publicId: a.publicId,
    name: a.name,
    gender: a.gender,
    imageUrl: a.imageUrl,
    sortOrder: a.sortOrder,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

// Just the identifier segment — NOT prefixed with the folder path.
// `folder` is passed separately to uploadBuffer(), which already tells
// Cloudinary where to place the asset. Baking the folder into publicId
// AND passing folder separately caused a doubled path
// (lokalfrnd/avatars/lokalfrnd/avatars/<hash>) on Cloudinary's side.
function newPublicId() {
  return crypto.randomBytes(8).toString("hex");
}

async function listAvatars(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);

  const { avatars, total } = await repo.listAvatars({
    page,
    limit,
    search: query.search,
    gender: query.gender,
    isActive: query.isActive === undefined ? undefined : query.isActive === "true" || query.isActive === true,
  });

  return { avatars: avatars.map(serializeAvatar), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getAvatarById(id) {
  const avatar = await repo.findById(id);
  if (!avatar || avatar.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Avatar not found");
  return serializeAvatar(avatar);
}

async function createAvatar({ name, gender, sortOrder }, file, createdById) {
  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "An avatar image is required");

  const uploaded = await cloudinaryBuffer.uploadBuffer(file.buffer, {
    folder: CLOUDINARY_AVATAR_FOLDER,
    publicId: newPublicId(),
  });

  const created = await repo.create({
    name,
    gender,
    imageUrl: uploaded.secure_url,
    cloudinaryPublicId: uploaded.public_id,
    sortOrder: sortOrder ?? 0,
    createdById: createdById ? BigInt(createdById) : null,
  });

  return serializeAvatar(created);
}

async function updateAvatar(id, { name, gender, sortOrder, isActive }, file, updatedById) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Avatar not found");

  const data = { name, gender, sortOrder, isActive, updatedById: updatedById ? BigInt(updatedById) : null };

  // Upload the new image first — only delete the old Cloudinary asset once
  // the new one has successfully landed, so a failed upload never leaves
  // the avatar pointing at nothing.
  if (file) {
    const uploaded = await cloudinaryBuffer.uploadBuffer(file.buffer, {
      folder: CLOUDINARY_AVATAR_FOLDER,
      publicId: newPublicId(),
    });
    data.imageUrl = uploaded.secure_url;
    data.cloudinaryPublicId = uploaded.public_id;
  }

  const updated = await repo.update(id, data);

  if (file) {
    await cloudinaryBuffer.deleteImage(existing.cloudinaryPublicId);
  }

  return serializeAvatar(updated);
}

async function deleteAvatar(id) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Avatar not found");

  const usageCount = await repo.countUsersUsingAvatar(id);
  await repo.softDelete(id); // always stop offering it, regardless of usage

  if (usageCount === 0) {
    await cloudinaryBuffer.deleteImage(existing.cloudinaryPublicId);
  }

  return { id: Number(id), deleted: true, usersStillUsingIt: usageCount };
}

module.exports = { listAvatars, getAvatarById, createAvatar, updateAvatar, deleteAvatar };
