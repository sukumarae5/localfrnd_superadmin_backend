const Joi = require("joi");
const { DOC_TYPES, REQUEST_STATUSES } = require("./verifications.constants");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string()
    .valid(...REQUEST_STATUSES)
    .optional(),
  docType: Joi.string()
    .valid(...DOC_TYPES)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

const decisionSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  reason: Joi.string().trim().max(500).when("status", {
    is: "rejected",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const flagSchema = Joi.object({
  flagged: Joi.boolean().required(),
});

const submitSchema = Joi.object({
  docType: Joi.string()
    .valid(...DOC_TYPES)
    .required(),
  docNumber: Joi.string().trim().max(50).required(),
  docExpiry: Joi.date().iso().allow(null).optional(),
  nationality: Joi.string().trim().max(50).optional(),
});

const aiResultsSchema = Joi.object({
  faceMatchScore: Joi.number().min(0).max(100).optional(),
  selfieQuality: Joi.string().max(20).optional(),
  idFrontReadable: Joi.boolean().optional(),
  idBackSharp: Joi.boolean().optional(),
  ocrName: Joi.string().max(150).optional(),
  ocrAddress: Joi.string().max(300).optional(),
  nameMatched: Joi.boolean().optional(),
  addressMatched: Joi.boolean().optional(),
  idAuthenticity: Joi.boolean().optional(),
  faceLiveness: Joi.boolean().optional(),
  sanctionListOk: Joi.boolean().optional(),
  riskScore: Joi.number().min(0).max(100).optional(),
});

module.exports = {
  listQuerySchema,
  decisionSchema,
  flagSchema,
  submitSchema,
  aiResultsSchema,
};
