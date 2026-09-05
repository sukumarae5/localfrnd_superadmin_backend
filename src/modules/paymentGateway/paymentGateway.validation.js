const Joi = require("joi");

const { GATEWAY_NAMES, ENVIRONMENTS } = require("./paymentGateway.constants");

const createGatewayConfigSchema = Joi.object({
  gateway: Joi.string().valid(...GATEWAY_NAMES).required(),
  merchantId: Joi.string().trim().min(1).max(100).required(),
  environment: Joi.string().valid(...ENVIRONMENTS).default("sandbox"),

  apiKey: Joi.string().trim().min(1).optional(), // plaintext in request, encrypted before storage
  webhookSecret: Joi.string().trim().min(1).optional(),

  emiEnabled: Joi.boolean().default(false),
  autoRefundEnabled: Joi.boolean().default(false),
  smartRetryEnabled: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

const updateGatewayConfigSchema = Joi.object({
  merchantId: Joi.string().trim().min(1).max(100).optional(),
  environment: Joi.string().valid(...ENVIRONMENTS).optional(),

  apiKey: Joi.string().trim().min(1).optional(),
  webhookSecret: Joi.string().trim().min(1).optional(),

  emiEnabled: Joi.boolean().optional(),
  autoRefundEnabled: Joi.boolean().optional(),
  smartRetryEnabled: Joi.boolean().optional(),

  isActive: Joi.boolean().optional(),
}).min(1);

module.exports = {
  createGatewayConfigSchema,
  updateGatewayConfigSchema,
};
