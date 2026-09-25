const express = require("express");

const router = express.Router();

const controller = require(
  "./userLifestyle.controller"
);

const {
  selectLifestylesSchema,
} = require(
  "./userLifestyle.validation"
);

const validate = require(
  "../../middleware/validation.middleware"
);

/**
 * IMPORTANT:
 *
 * Use the same user authentication
 * middleware that your existing user
 * profile / interest APIs use.
 *
 * If your project exports
 * authenticateUser from Userauth.middleware,
 * use this.
 */
const {
  authenticateUser,
} = require(
  "../../middleware/Userauth.middleware"
);

/**
 * Publicly available lifestyle options.
 *
 * Authentication can be added here if your
 * existing interest options API requires it.
 */
router.get(
  "/options",
  controller.getOptions
);

/**
 * Get logged-in user's lifestyles.
 */
router.get(
  "/me",
  authenticateUser,
  controller.getMine
);

/**
 * Save logged-in user's lifestyles.
 */
router.put(
  "/me",
  authenticateUser,
  validate(
    selectLifestylesSchema,
    "body"
  ),
  controller.setMine
);

module.exports = router;