const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./cms.repository");

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

// Public consumer (app) — published content only, ever.
async function getPublishedPage(pageKey, language) {
  const cmsPage = await repo.findPublishedByKey(pageKey, language);
  if (!cmsPage) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `${pageKey} is not published for language "${language}"`);
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
    effectiveAt: payload.effectiveAt,
    changeNote: payload.changeNote,
    adminId,
  });
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
  publishPage,
  updatePageStatus,
  listRevisions,
  restoreRevision,
};