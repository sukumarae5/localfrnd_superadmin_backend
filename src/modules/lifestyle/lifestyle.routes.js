const express = require("express");

const router = express.Router();

const controller = require(
  "./lifestyle.controller"
);

const validation = require(
  "./lifestyle.validation"
);

const validate = require(
  "../../middleware/validation.middleware"
);

const {
  authenticate,
  requireRole,
} = require(
  "../../middleware/auth.middleware"
);

const {
  ADMIN_ROLES,
} = require("../../constants");

router.use(
  authenticate,
  requireRole(
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.ADMIN
  )
);

router.get(
  "/",
  validate(
    validation.listQuerySchema,
    "query"
  ),
  controller.getLifestyles
);

router.get(
  "/:publicId",
  validate(
    validation.publicIdParamSchema,
    "params"
  ),
  controller.getLifestyle
);

router.post(
  "/",
  validate(
    validation.createSchema,
    "body"
  ),
  controller.createLifestyle
);

router.put(
  "/:publicId",
  validate(
    validation.publicIdParamSchema,
    "params"
  ),
  validate(
    validation.updateSchema,
    "body"
  ),
  controller.updateLifestyle
);

router.delete(
  "/:publicId",
  validate(
    validation.publicIdParamSchema,
    "params"
  ),
  controller.deleteLifestyle
);

module.exports = router;