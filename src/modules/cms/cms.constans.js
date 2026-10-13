// src/modules/cms/cms.constans.js
// (keeping the existing misspelled filename so current imports don't break)

const CMS_PAGE_KEYS = ["about_us", "privacy_policy", "terms_conditions", "contact_us"];
const CMS_PAGE_STATUSES = ["draft", "published", "archived"];
const DEFAULT_LANGUAGE = "en";

// Matches the "Visibility" card in the admin UI (Android / iOS / Website / Landing Page)
const CMS_PLATFORMS = ["android", "ios", "website", "landing"];

const CMS_IMAGE_FOLDER = "lokalfrnd/cms";

module.exports = {
  CMS_PAGE_KEYS,
  CMS_PAGE_STATUSES,
  DEFAULT_LANGUAGE,
  CMS_PLATFORMS,
  CMS_IMAGE_FOLDER,
};