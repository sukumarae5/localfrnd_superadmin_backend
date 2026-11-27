const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const cloudinaryBuffer = require("../../utils/cloudinaryBuffer.util");
const { MAX_USER_PHOTOS, CLOUDINARY_USER_PHOTOS_FOLDER } = require("./userPhoto.constants");
const repo = require("./userPhoto.repository");

const serializePhoto = (p) => ({
  id: p.publicId,
  imageUrl: p.imageUrl,
  sortOrder: p.sortOrder,
  createdAt: p.createdAt,
});

async function listPhotos(userId) {
  const photos = await repo.listByUserId(userId);
  return photos.map(serializePhoto);
}

async function addPhotos(userId, files) {
  if (!files || files.length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'At least one photo is required (form-data field "photos")');
  }

  const existing = await repo.countByUserId(userId);
  if (existing + files.length > MAX_USER_PHOTOS) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `You can have at most ${MAX_USER_PHOTOS} photos (you already have ${existing})`
    );
  }

  // 1) Upload to Cloudinary. If one fails, remove the ones already uploaded.
  const uploaded = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const result = await cloudinaryBuffer.uploadBuffer(files[i].buffer, {
        folder: CLOUDINARY_USER_PHOTOS_FOLDER,
        publicId: `${userId}_${Date.now()}_${i}`,
      });
      uploaded.push(result);
    }
  } catch (err) {
    await Promise.all(uploaded.map((u) => cloudinaryBuffer.deleteImage(u.public_id)));
    throw err;
  }

  // 2) Save rows. If this fails, don't leave orphaned images on Cloudinary.
  try {
    const rows = await repo.createMany(
      userId,
      uploaded.map((u, i) => ({
        imageUrl: u.secure_url,
        cloudinaryPublicId: u.public_id,
        sortOrder: existing + i,
      }))
    );
    return rows.map(serializePhoto);
  } catch (err) {
    await Promise.all(uploaded.map((u) => cloudinaryBuffer.deleteImage(u.public_id)));
    throw err;
  }
}

async function removePhoto(userId, publicId) {
  const photo = await repo.findByPublicId(userId, publicId);
  if (!photo) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Photo not found");

  await repo.deleteById(photo.id);
  await cloudinaryBuffer.deleteImage(photo.cloudinaryPublicId); // failure here is non-fatal
}

module.exports = { listPhotos, addPhotos, removePhoto };