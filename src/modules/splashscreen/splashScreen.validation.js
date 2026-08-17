// src/modules/splashscreen/splashScreen.validation.js
const Joi = require('joi');
const {
  SPLASH_SCREEN_TYPE,
  SPLASH_PLATFORM,
  SPLASH_PRIORITY,
  SPLASH_STATUS,
  SPLASH_BULK_ACTIONS,
} = require('./splashScreen.constants');

const publicIdOrIdParam = Joi.object({
  id: Joi.string().required(),
});

const listSplashScreensQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(12),
  search: Joi.string().trim().allow('').optional(),
  screenType: Joi.string().valid(...Object.values(SPLASH_SCREEN_TYPE)).optional(),
  status: Joi.string().valid(...Object.values(SPLASH_STATUS)).optional(),
  platform: Joi.string().valid(...Object.values(SPLASH_PLATFORM)).optional(),
  appVersion: Joi.string().trim().optional(),
  campaign: Joi.string().trim().optional(),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'name', 'status', 'priority')
    .default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const createSplashScreenBody = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  screenType: Joi.string().valid(...Object.values(SPLASH_SCREEN_TYPE)).required(),
  campaign: Joi.string().trim().max(150).allow('', null).optional(),
  platform: Joi.string().valid(...Object.values(SPLASH_PLATFORM)).default(SPLASH_PLATFORM.ALL),
  appVersion: Joi.string().trim().max(30).allow('', null).optional(),
  priority: Joi.string().valid(...Object.values(SPLASH_PRIORITY)).default(SPLASH_PRIORITY.P3),
  status: Joi.string().valid(...Object.values(SPLASH_STATUS)).default(SPLASH_STATUS.DRAFT),
  resolutionW: Joi.number().integer().positive().optional(),
  resolutionH: Joi.number().integer().positive().optional(),
  durationSec: Joi.number().positive().precision(2).optional(),
  format: Joi.string().valid('svg', 'webgl', 'png', 'jpg', 'webp').optional(),
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().min(Joi.ref('startAt')).optional(),
});

const updateSplashScreenBody = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  screenType: Joi.string().valid(...Object.values(SPLASH_SCREEN_TYPE)).optional(),
  campaign: Joi.string().trim().max(150).allow('', null).optional(),
  platform: Joi.string().valid(...Object.values(SPLASH_PLATFORM)).optional(),
  appVersion: Joi.string().trim().max(30).allow('', null).optional(),
  resolutionW: Joi.number().integer().positive().optional(),
  resolutionH: Joi.number().integer().positive().optional(),
  durationSec: Joi.number().positive().precision(2).optional(),
  format: Joi.string().valid('svg', 'webgl', 'png', 'jpg', 'webp').optional(),
}).min(1);

const updateStatusBody = Joi.object({
  status: Joi.string().valid(...Object.values(SPLASH_STATUS)).required(),
  reason: Joi.string().trim().max(300).allow('', null).optional(),
});

const updateScheduleBody = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().min(Joi.ref('startAt')).required(),
});

const updatePriorityBody = Joi.object({
  priority: Joi.string().valid(...Object.values(SPLASH_PRIORITY)).required(),
});

const bulkActionBody = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).max(200).required(),
  action: Joi.string().valid(...Object.values(SPLASH_BULK_ACTIONS)).required(),
  reason: Joi.string().trim().max(300).allow('', null).optional(),
});

const dailyViewsQuery = Joi.object({
  range: Joi.number().integer().min(1).max(90).default(7),
});

module.exports = {
  publicIdOrIdParam,
  listSplashScreensQuery,
  createSplashScreenBody,
  updateSplashScreenBody,
  updateStatusBody,
  updateScheduleBody,
  updatePriorityBody,
  bulkActionBody,
  dailyViewsQuery,
};