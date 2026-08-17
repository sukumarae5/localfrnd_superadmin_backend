// src/utils/cloudinaryBuffer.util.js
// For flows needing explicit control over the Cloudinary public_id and
// delete-on-replace behavior (avatar management, user custom photo upload) —
// unlike upload.middleware.js (CloudinaryStorage, used for KYC docs), this
// uploads a raw buffer via upload_stream so the caller decides the public_id
// and when the old asset gets deleted.
const cloudinary = require("../config/cloudinary");

function uploadBuffer(buffer, { folder, publicId }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image", overwrite: true },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

function deleteImage(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch((err) => {
    // A failed cleanup should never block the actual DB update — an orphaned
    // Cloudinary asset is a much smaller problem than a user stuck unable to
    // change their photo.
    console.warn("Cloudinary delete failed (non-fatal):", publicId, err.message);
  });
}

module.exports = { uploadBuffer, deleteImage };