// src/middleware/uploadMemory.middleware.js
const multer = require("multer");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(HTTP_STATUS.BAD_REQUEST, `Only JPG, PNG, WEBP images are allowed (got ${file.mimetype})`));
  }
  cb(null, true);
}

// Memory storage, not CloudinaryStorage — the service layer controls the
// public_id and upload timing so it can implement delete-old-then-upload-new.
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = uploadMemory;