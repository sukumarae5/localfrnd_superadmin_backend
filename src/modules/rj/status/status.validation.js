// src/modules/rj/status/status.validation.js
const Joi = require("joi");
const { RJ_STATUSES, OFFLINE_REASONS, MAX_PAGE_SIZE } = require("./status.constants");

const listOnlineQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  status: Joi.string().valid(...RJ_STATUSES.filter((s) => s !== "offline")).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  languageId: Joi.number().integer().positive().optional(),
});

const listOfflineQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).optional(),
  search: Joi.string().trim().max(150).optional(),
  reason: Joi.string().valid(...OFFLINE_REASONS).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  languageId: Joi.number().integer().positive().optional(),
  lastActiveHours: Joi.number().integer().positive().optional(),
});

const heartbeatSchema = Joi.object({
  deviceModel: Joi.string().trim().max(100).optional(),
  osVersion: Joi.string().trim().max(50).optional(),
  batteryPct: Joi.number().integer().min(0).max(100).optional(),
  networkType: Joi.string().trim().max(20).optional(),
  networkStrength: Joi.string().trim().max(20).optional(),
});

const goOfflineSchema = Joi.object({
  reason: Joi.string().valid(...OFFLINE_REASONS).optional(),
});

const sendNotificationSchema = Joi.object({
  rjIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  message: Joi.string().trim().min(1).max(500).required(),
});

module.exports = {
  listOnlineQuerySchema,
  listOfflineQuerySchema,
  heartbeatSchema,
  goOfflineSchema,
  sendNotificationSchema,
};