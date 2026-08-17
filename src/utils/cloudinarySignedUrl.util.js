// src/utils/cloudinarySignedUrl.util.js
const cloudinary = require("../config/cloudinary");

function getSignedUrl(publicId) {
  return cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
}

module.exports = { getSignedUrl };