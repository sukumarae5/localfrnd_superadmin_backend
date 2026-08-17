const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/apiError.util");
const { HTTP_STATUS } = require("../constants");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: process.env.CLOUDINARY_KYC_FOLDER || "lokalfrnd/kyc",
    public_id: `${req.params.id || req.body.userId || "unknown"}_${file.fieldname}_${Date.now()}`,
    resource_type: "image",
    type: "authenticated",
    format: "jpg",
  }),
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(HTTP_STATUS.BAD_REQUEST, `Only JPG, PNG, WEBP images are allowed (got ${file.mimetype})`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;