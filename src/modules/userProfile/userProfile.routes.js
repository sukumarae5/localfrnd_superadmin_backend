const express = require("express");
const router = express.Router();
const { Country, State, City } = require("country-state-city");
const ApiError = require("../../utils/apiError.util");

const flagUrl = (iso) => `https://flagcdn.com/w80/${iso.toLowerCase()}.png`;
const byName = (a, b) => a.name.localeCompare(b.name);

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


// GET /api/user/profile/locations/countries
router.get("/locations/countries", (req, res) => {
  const countries = Country.getAllCountries()
    .map((c) => ({ isoCode: c.isoCode, name: c.name, flagUrl: flagUrl(c.isoCode) }))
    .sort(byName);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { countries }, "Countries fetched"));
});

// GET /api/user/profile/locations/states?countryCode=IN
router.get("/locations/states", (req, res) => {
  const countryCode = String(req.query.countryCode || "").toUpperCase();
  if (!countryCode) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "countryCode query param is required");
  const states = State.getStatesOfCountry(countryCode)
    .map((s) => ({ isoCode: s.isoCode, name: s.name }))
    .sort(byName);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { states }, "States fetched"));
});

// GET /api/user/profile/locations/cities?countryCode=IN&stateCode=TG
router.get("/locations/cities", (req, res) => {
  const countryCode = String(req.query.countryCode || "").toUpperCase();
  const stateCode = String(req.query.stateCode || "").toUpperCase();
  if (!countryCode || !stateCode) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "countryCode and stateCode query params are required");
  }
  const cities = City.getCitiesOfState(countryCode, stateCode)
    .map((c) => ({ name: c.name }))
    .sort(byName);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { cities }, "Cities fetched"));
});


module.exports = router;