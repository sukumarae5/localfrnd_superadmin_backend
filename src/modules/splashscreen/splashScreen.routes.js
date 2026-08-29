const express = require('express');
const router = express.Router();

const controller = require('./splashScreen.controller');
const validate = require('../../middleware/validation.middleware');
const { authenticate, requireRole } = require('../../middleware/auth.middleware');

const upload = require('../../middleware/avatarUpload.middleware');
const { ADMIN_ROLES } = require('../../constants');

const {
  listSplashScreensQuery,
  createSplashScreenBody,
  updateSplashScreenBody,
  updateStatusBody,
  updateScheduleBody,
  updatePriorityBody,
  bulkActionBody,
  dailyViewsQuery,
  publicIdOrIdParam,
} = require('./splashScreen.validation');

router.use(authenticate, requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

router.get('/stats', controller.getStats);
router.get('/filters/meta', controller.getFilterMeta);
router.get('/analytics/type-distribution', controller.getTypeDistribution);

router.post('/bulk-action', validate(bulkActionBody, 'body'), controller.bulkAction);

router.get('/', validate(listSplashScreensQuery, 'query'), controller.listSplashScreens);

router.post(
  '/',
  upload.single('thumbnail'),
  validate(createSplashScreenBody, 'body'),
  controller.createSplashScreen
);

router.get('/:id', validate(publicIdOrIdParam, 'params'), controller.getSplashScreenById);

router.put(
  '/:id',
  validate(publicIdOrIdParam, 'params'),
  validate(updateSplashScreenBody, 'body'),
  controller.updateSplashScreen
);

router.delete('/:id', validate(publicIdOrIdParam, 'params'), controller.deleteSplashScreen);

router.patch(
  '/:id/',
  validate(publicIdOrIdParam, 'params'),
  validate(updateStatusBody, 'body'),
  controller.updateStatus
);

router.patch(
  '/:id/schedule',
  validate(publicIdOrIdParam, 'params'),
  validate(updateScheduleBody, 'body'),
  controller.updateSchedule
);

router.patch(
  '/:id/priority',
  validate(publicIdOrIdParam, 'params'),
  validate(updatePriorityBody, 'body'),
  controller.updatePriority
);

router.post(
  '/:id/thumbnail',
  validate(publicIdOrIdParam, 'params'),
  upload.single('thumbnail'),
  controller.uploadThumbnail
);

router.delete('/:id/thumbnail', validate(publicIdOrIdParam, 'params'), controller.removeThumbnail);

router.get(
  '/:id/analytics/daily-views',
  validate(publicIdOrIdParam, 'params'),
  validate(dailyViewsQuery, 'query'),
  controller.getDailyViews
);

router.get('/:id/activity', validate(publicIdOrIdParam, 'params'), controller.getActivityTimeline);

module.exports = router;