const express = require("express");

const router = express.Router();

const controller = require(
  "./lifestyleCategory.controller"
);

const validation = require(
  "./lifestyleCategory.validation"
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
  controller.getCategories
);

router.get(
  "/:publicId",
  validate(
    validation.publicIdParamSchema,
    "params"
  ),
  controller.getCategory
);

router.post(
  "/",
  validate(
    validation.createSchema,
    "body"
  ),
  controller.createCategory
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
  controller.updateCategory
);

router.delete(
  "/:publicId",
  validate(
    validation.publicIdParamSchema,
    "params"
  ),
  controller.deleteCategory
);

module.exports = router;