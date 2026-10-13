// src/modules/cms/cms.service.js
const crypto = require("crypto");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const { uploadBuffer } = require("../../utils/cloudinaryBuffer.util");
const repo = require("./cms.repository");
const { CMS_IMAGE_FOLDER } = require("./cms.constans");

async function listPages(query) {
  const { page, limit, ...filters } = query;
  const [items, total] = await repo.list({ page, limit, filters });
  return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getPage(pageKey, language) {
  const cmsPage = await repo.findByKey(pageKey, language);
  if (!cmsPage) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      `No ${pageKey} content saved yet for language "${language}" — save a draft first`
    );
  }
  return cmsPage;
}

// Public consumer (app/web) — published content only, ever.
// platform (optional): android | ios | website | landing. An empty visibility
// object ({}) means "visible everywhere" so pages saved before the Visibility
// card existed keep working.
async function getPublishedPage(pageKey, language, platform) {
  const cmsPage = await repo.findPublishedByKey(pageKey, language);
  if (!cmsPage) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `${pageKey} is not published for language "${language}"`);
  }

  if (platform) {
    const visibility = cmsPage.visibility || {};
    const hasRules = Object.keys(visibility).length > 0;
    if (hasRules && visibility[platform] !== true) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `${pageKey} is not available on ${platform}`);
    }
  }

  return cmsPage;
}

async function saveDraft(pageKey, payload, adminId) {
  return repo.saveDraft({
    pageKey,
    language: payload.language,
    title: payload.title,
    slug: payload.slug,
    content: payload.content,
    seo: payload.seo,
    visibility: payload.visibility,
    effectiveAt: payload.effectiveAt,
    changeNote: payload.changeNote,
    adminId,
  });
}

async function patchSection(pageKey, sectionKey, payload, adminId) {
  const page = await repo.patchSection({
    pageKey,
    language: payload.language,
    sectionKey,
    data: payload.data,
    remove: false,
    changeNote: payload.changeNote,
    adminId,
  });
  if (!page) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      `No ${pageKey} content saved yet for language "${payload.language}" — save a draft first (PUT /pages/${pageKey})`
    );
  }
  return page;
}

async function removeSection(pageKey, sectionKey, language, adminId) {
  const existing = await getPage(pageKey, language);
  if (!existing.content || !(sectionKey in existing.content)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `Section "${sectionKey}" does not exist on ${pageKey}`);
  }
  return repo.patchSection({ pageKey, language, sectionKey, remove: true, adminId });
}

async function updateSettings(pageKey, payload, adminId) {
  const existing = await getPage(pageKey, payload.language);
  return repo.updateSettings({
    pageId: existing.id,
    seo: payload.seo,
    visibility: payload.visibility,
    adminId,
  });
}

// Uploads one image (hero banner, team photo...) and returns its URL. The admin
// UI then stores that URL inside the relevant section via PATCH /sections/:key.
async function uploadImage(pageKey, file) {
  if (!file || !file.buffer) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Image file is required (form-data field name: image)");
  }

  const result = await uploadBuffer(file.buffer, {
    folder: `${CMS_IMAGE_FOLDER}/${pageKey}`,
    publicId: crypto.randomBytes(8).toString("hex"),
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

async function publishPage(pageKey, language, changeNote, adminId) {
  const existing = await getPage(pageKey, language);
  return repo.publish({ pageId: existing.id, adminId, changeNote });
}

async function updatePageStatus(pageKey, language, status, adminId) {
  const existing = await getPage(pageKey, language);
  return repo.updateStatus({ pageId: existing.id, status, adminId });
}

async function listRevisions(pageKey, query) {
  const existing = await getPage(pageKey, query.language);
  const [items, total] = await repo.listRevisions({ pageId: existing.id, page: query.page, limit: query.limit });
  return { items, meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) || 1 } };
}

async function restoreRevision(pageKey, revisionId, language, adminId) {
  const existing = await getPage(pageKey, language);
  const revision = await repo.findRevisionById(existing.id, revisionId);
  if (!revision) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Revision not found for this page");
  }
  return repo.restoreRevision({ pageId: existing.id, revision, adminId });
}

module.exports = {
  listPages,
  getPage,
  getPublishedPage,
  saveDraft,
  patchSection,
  removeSection,
  updateSettings,
  uploadImage,
  publishPage,
  updatePageStatus,
  listRevisions,
  restoreRevision,
};