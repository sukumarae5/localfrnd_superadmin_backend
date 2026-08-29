const express = require("express");
const router = express.Router();

const controller = require("./userInterest.controller");
const { selectInterestsSchema } = require("./userInterest.validation");
const validate = require("../../middleware/validation.middleware");
const { authenticateUser } = require("../../middleware/Userauth.middleware");

router.get("/options", controller.getOptions);
router.get("/me", authenticateUser, controller.getMine);
router.put("/me", authenticateUser, validate(selectInterestsSchema, "body"), controller.setMine);

module.exports = router;