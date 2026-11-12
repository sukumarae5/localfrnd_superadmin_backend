const express = require("express");
const router = express.Router();

const controller = require("./userProfile.controller");
const { authenticateUser } = require("../../middleware/Userauth.middleware");
const validate = require("../../middleware/validation.middleware");
const { updateUserSchema } = require("../users/users.validation");

const { prisma } = require("../../config/database");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

router.use(authenticateUser);

// GET /api/user/profile
router.get("/", controller.getMe);

// PUT /api/user/profile
router.put("/", validate(updateUserSchema), controller.updateMe);

// DELETE /api/user/profile
router.delete("/", controller.deleteMe);

// GET /api/user/profile/languages: active languages for the onboarding dropdown
router.get("/languages", async (req, res, next) => {
  try {
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, nativeName: true },
    });
    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { languages }, "Languages fetched"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;