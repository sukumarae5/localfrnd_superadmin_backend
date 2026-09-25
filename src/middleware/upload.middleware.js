// src/middleware/upload.middleware.js

const multer = require("multer");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

const MAX_FILE_SIZE_MB = 5;

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  console.log("========== MULTER FILE ==========");
  console.log("fieldname:", file.fieldname);
  console.log("originalname:", file.originalname);
  console.log("mimetype:", file.mimetype);

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/octet-stream",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Only JPG, PNG, WEBP images are allowed (got ${file.mimetype})`
      )
    );
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

module.exports = upload;