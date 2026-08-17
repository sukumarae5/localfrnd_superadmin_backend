// src/modules/splashscreen/splashScreen.constants.js

const SPLASH_SCREEN_TYPE = {
  WELCOME: 'welcome',
  PROMO: 'promo',
  OTHER: 'other',
};

const SPLASH_PLATFORM = {
  IOS: 'ios',
  ANDROID: 'android',
  ALL: 'all',
};

const SPLASH_PRIORITY = {
  P1: 'p1',
  P2: 'p2',
  P3: 'p3',
};

const SPLASH_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  EXPIRED: 'expired',
};

// Allowed forward transitions for PATCH /:id/status
const SPLASH_STATUS_TRANSITIONS = {
  [SPLASH_STATUS.DRAFT]: [SPLASH_STATUS.SCHEDULED, SPLASH_STATUS.ACTIVE],
  [SPLASH_STATUS.SCHEDULED]: [SPLASH_STATUS.ACTIVE, SPLASH_STATUS.DRAFT, SPLASH_STATUS.EXPIRED],
  [SPLASH_STATUS.ACTIVE]: [SPLASH_STATUS.EXPIRED],
  [SPLASH_STATUS.EXPIRED]: [], // terminal
};

const SPLASH_BULK_ACTIONS = {
  ACTIVATE: 'activate',
  DEACTIVATE: 'deactivate', // -> expired
  DELETE: 'delete',
};

const SPLASH_ACTIVITY_ACTION = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  SCHEDULED: 'scheduled',
  UPDATED: 'updated',
  THUMBNAIL_UPDATED: 'thumbnail_updated',
  DELETED: 'deleted',
  PRIORITY_CHANGED: 'priority_changed',
};

const SPLASH_DISPLAY_CODE_PREFIX = 'SPL';
const SPLASH_DISPLAY_CODE_MAX_RETRY = 5; // on P2002 collision, mirrors displayCode retry convention

const SPLASH_CLOUDINARY_FOLDER = 'splash-screens';

const SPLASH_DEFAULT_PAGE = 1;
const SPLASH_DEFAULT_LIMIT = 12; // matches "Rows per page: 12" in UI

const SPLASH_ANALYTICS_DEFAULT_RANGE_DAYS = 7;

module.exports = {
  SPLASH_SCREEN_TYPE,
  SPLASH_PLATFORM,
  SPLASH_PRIORITY,
  SPLASH_STATUS,
  SPLASH_STATUS_TRANSITIONS,
  SPLASH_BULK_ACTIONS,
  SPLASH_ACTIVITY_ACTION,
  SPLASH_DISPLAY_CODE_PREFIX,
  SPLASH_DISPLAY_CODE_MAX_RETRY,
  SPLASH_CLOUDINARY_FOLDER,
  SPLASH_DEFAULT_PAGE,
  SPLASH_DEFAULT_LIMIT,
  SPLASH_ANALYTICS_DEFAULT_RANGE_DAYS,
};