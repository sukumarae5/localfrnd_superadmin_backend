// src/modules/faq/faq.public.routes.js
// Mounted at /api/public/faq — genuinely no auth, same reasoning as
// cms.public.routes.js: a Help/FAQ screen is a pre-login surface.
const express = require("express");
const router = express.Router();

const faqController = require("./faq.controller");
const faqValidation = require("./faq.validation");
const faqCategoryController = require("../faqCategory/faqCategory.controller");
const validate = require("../../middleware/validation.middleware");

// GET /api/public/faq/categories — active categories, for a filter UI
router.get("/categories", faqCategoryController.getActiveCategories);

// GET /api/public/faq?categoryPublicId=&language=&search=
router.get("/", validate(faqValidation.publicListQuerySchema, "query"), faqController.getPublishedFaqs);

module.exports = router;