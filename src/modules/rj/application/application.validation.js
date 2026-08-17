// src/modules/rj/application/application.validation.js
const Joi = require("joi");
const {
  APPLICATION_STATUSES,
  PRIORITIES,
  DOC_TYPES,
  MAX_PAGE_SIZE,
} = require("./application.constants");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  status: Joi.string().valid(...APPLICATION_STATUSES).optional(),
  priority: Joi.string().valid(...PRIORITIES).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  kycStatus: Joi.string().valid("verified", "pending").optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sortBy: Joi.string().valid("submittedAt", "priority").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

const submitApplicationSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  categoryId: Joi.number().integer().positive().optional(),
  experienceYears: Joi.number().integer().min(0).max(60).optional(),
});

const addDocumentSchema = Joi.object({
  docType: Joi.string().valid(...DOC_TYPES).required(),
});

const aiResultsSchema = Joi.object({
  aadhaarMatch: Joi.boolean().optional(),
  panMatch: Joi.boolean().optional(),
  faceIdMatchScore: Joi.number().min(0).max(100).optional(),
  aiSuitabilityScore: Joi.number().min(0).max(100).optional(),
  communicationScore: Joi.number().min(0).max(100).optional(),
  riskScore: Joi.number().min(0).max(100).optional(),
});

const decisionSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  reason: Joi.string().trim().max(500).when("status", {
    is: "rejected",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const updatePrioritySchema = Joi.object({
  priority: Joi.string().valid(...PRIORITIES).required(),
});

module.exports = {
  listQuerySchema,
  submitApplicationSchema,
  addDocumentSchema,
  aiResultsSchema,
  decisionSchema,
  updatePrioritySchema,
};