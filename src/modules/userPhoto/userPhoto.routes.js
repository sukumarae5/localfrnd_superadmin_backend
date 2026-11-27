const express = require("express");
const multer = require("multer");
const controller = require("./userPhoto.controller");
const upload = require("../../middleware/upload.middleware");
const ApiError = require("../../utils/apiError.util");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { HTTP_STATUS } = require("../../constants");
const { MAX_USER_PHOTOS } = require("./userPhoto.constants");

// Turn multer's own errors into clean 400 responses instead of a generic 500
function uploadPhotos(req, res, next) {
  upload.array("photos", MAX_USER_PHOTOS)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Each photo must be smaller than 5 MB"
          : err.code === "LIMIT_UNEXPECTED_FILE"
          ? `Send at most ${MAX_USER_PHOTOS} files in the form-data field "photos"`
          : err.message;
      return next(new ApiError(HTTP_STATUS.BAD_REQUEST, message));
    }
    next(err);
  });
}

const router = express.Router();
router.use(authenticateUser);

router.get("/", controller.list);
router.post("/", uploadPhotos, controller.add);
router.delete("/:id", controller.remove);

module.exports = router;