const Joi = require("joi");
const { FEEDBACK_TYPES, FEEDBACK_STATUSES, FEEDBACK_PRIORITIES } = require("./feedback.constants");

const listFeedbackQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(150).optional(),
  type: Joi.string().valid(...FEEDBACK_TYPES).optional(),
  status: Joi.string().valid(...FEEDBACK_STATUSES).optional(),
  priority: Joi.string().valid(...FEEDBACK_PRIORITIES).optional(),
  category: Joi.string().trim().max(50).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

// For the mobile-app-facing create endpoint, if/when you split it out —
// see the note at the end of this module.
const createFeedbackSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  type: Joi.string().valid(...FEEDBACK_TYPES).required(),
  subject: Joi.string().trim().max(200).required(),
  message: Joi.string().trim().min(1).required(),
  category: Joi.string().trim().max(50).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...FEEDBACK_STATUSES).required(),
  resolutionNote: Joi.string().trim().max(1000).when("status", {
    is: "resolved",
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
});

const assignSchema = Joi.object({
  assignedToId: Joi.number().integer().positive().required(),
});

const setPrioritySchema = Joi.object({
  priority: Joi.string().valid(...FEEDBACK_PRIORITIES).required(),
});

module.exports = { listFeedbackQuerySchema, createFeedbackSchema, updateStatusSchema, assignSchema, setPrioritySchema };