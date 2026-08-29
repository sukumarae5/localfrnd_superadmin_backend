const express = require("express");
const controller = require("./bankAccount.controller");
const validate = require("../../middleware/validation.middleware");
const { authenticate, requireRole } = require("../../middleware/auth.middleware");
const { ADMIN_ROLES } = require("../../constants");
const { listBankAccountsQuerySchema, approveSchema, rejectSchema, noteSchema } = require("./bankAccount.validation");

const router = express.Router();

router.use(authenticate);

// GET /api/rj/bank-accounts?status=&search=&accountOrUpi=&bankName=&duplicatesOnly=
router.get("/", validate(listBankAccountsQuerySchema, "query"), controller.list);

// GET /api/rj/bank-accounts/:id  — :id is publicId (uuid)
router.get("/:id", controller.getOne);

router.patch(
  "/:id/approve",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(approveSchema),
  controller.approve
);
router.patch(
  "/:id/reject",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(rejectSchema),
  controller.reject
);
router.patch(
  "/:id/notes",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  validate(noteSchema),
  controller.addNote
);
router.post(
  "/:id/penny-drop-retry",
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN),
  controller.retryPennyDrop
);

module.exports = router;