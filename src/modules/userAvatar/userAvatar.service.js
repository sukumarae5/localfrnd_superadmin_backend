const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const { CLOUDINARY_USER_AVATAR_FOLDER } = require("./userAvatar.constants");
const cloudinaryBuffer = require("../../utils/cloudinaryBuffer.util");
const repo = require("./userAvatar.repository");

function serializeAvatarOption(a) {
  return { id: a.id, name: a.name, gender: a.gender, imageUrl: a.imageUrl };
}

function serializeProfileAvatar(user) {
  return { avatarId: user.avatarId, avatarUrl: user.avatarUrl, isCustomAvatar: user.isCustomAvatar };
}

async function listAvatarsForUser(gender) {
  if (!gender) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "gender query param is required");
  const avatars = await repo.listActiveForGender(gender);
  return avatars.map(serializeAvatarOption);
}

async function selectAvatar(userId, avatarId) {
  const user = await repo.findUserById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const avatar = await repo.findAvatarById(avatarId);
  if (!avatar || avatar.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Avatar not found");
  if (!avatar.isActive) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This avatar is no longer available");
  if (user.gender && avatar.gender !== "unisex" && avatar.gender !== user.gender) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This avatar isn't available for your profile");
  }

  const previousCloudinaryId = user.avatarCloudinaryId; // only set if they had a custom photo
  const updated = await repo.selectAvatar(userId, avatar);

  if (previousCloudinaryId) await cloudinaryBuffer.deleteImage(previousCloudinaryId);

  return serializeProfileAvatar(updated);
}

async function uploadCustomAvatar(userId, file) {
  const user = await repo.findUserById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  if (!file) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "An image file is required");

  const uploaded = await cloudinaryBuffer.uploadBuffer(file.buffer, {
    folder: CLOUDINARY_USER_AVATAR_FOLDER,
    // Identifier only — NOT prefixed with the folder path. `folder` above
    // already tells Cloudinary where to place it; baking the folder into
    // publicId too caused a doubled path on Cloudinary's side.
    publicId: `${userId}_${Date.now()}`,
  });

  // Only ever the PREVIOUS custom photo — never a predefined avatar's asset,
  // since avatarCloudinaryId is only populated when isCustomAvatar is true.
  const previousCloudinaryId = user.avatarCloudinaryId;

  const updated = await repo.setCustomAvatar(userId, {
    avatarUrl: uploaded.secure_url,
    cloudinaryPublicId: uploaded.public_id,
  });

  if (previousCloudinaryId) await cloudinaryBuffer.deleteImage(previousCloudinaryId);

  return serializeProfileAvatar(updated);
}

async function removeCustomAvatar(userId) {
  const user = await repo.findUserById(userId);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  if (!user.isCustomAvatar) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "You don't have a custom photo to remove");

  const previousCloudinaryId = user.avatarCloudinaryId;
  const fallbackAvatar = user.avatarId ? await repo.findAvatarById(user.avatarId) : null;

  const updated = await repo.restoreToSelectedOrNull(userId, fallbackAvatar);
  await cloudinaryBuffer.deleteImage(previousCloudinaryId);

  return serializeProfileAvatar(updated);
}

module.exports = { listAvatarsForUser, selectAvatar, uploadCustomAvatar, removeCustomAvatar };

