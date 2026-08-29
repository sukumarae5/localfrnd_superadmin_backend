const express = require("express");
const controller = require("./banners.public.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const { activeBannersQuerySchema, publicIdParam } = require("./banners.validation");

const router = express.Router();

router.use(authenticateUser);

router.get("/active", validate(activeBannersQuerySchema, "query"), controller.getActiveBanners);
router.post("/:publicId/impression", validate(publicIdParam, "params"), controller.trackImpression);
router.post("/:publicId/click", validate(publicIdParam, "params"), controller.trackClick);

module.exports = router;