// src/modules/cms/cms.repository.js
const { prisma } = require("../../config/database");

const revisionSelect = {
  id: true,
  version: true,
  title: true,
  status: true,
  changeNote: true,
  createdAt: true,
  createdBy: { select: { publicId: true, fullName: true } },
};

function findByKey(pageKey, language) {
  return prisma.cmsPage.findUnique({
    where: { pageKey_language: { pageKey, language } },
  });
}

function findPublishedByKey(pageKey, language) {
  return prisma.cmsPage.findFirst({
    where: { pageKey, language, status: "published" },
  });
}

function list({ page, limit, filters }) {
  const where = {};
  if (filters.pageKey) where.pageKey = filters.pageKey;
  if (filters.language) where.language = filters.language;
  if (filters.status) where.status = filters.status;

  const skip = (page - 1) * limit;

  return prisma.$transaction([
    prisma.cmsPage.findMany({
      where,
      orderBy: [{ pageKey: "asc" }, { language: "asc" }],
      skip,
      take: limit,
    }),
    prisma.cmsPage.count({ where }),
  ]);
}

// Shared helper — every write path snapshots a revision inside the same
// transaction so a page and its history never disagree.
function createRevision(tx, page, changeNote, adminId) {
  return tx.cmsPageRevision.create({
    data: {
      pageId: page.id,
      version: page.version,
      title: page.title,
      content: page.content,
      status: page.status,
      changeNote: changeNote || null,
      createdById: adminId ?? undefined,
    },
  });
}

// Upserts the page row AND writes a revision snapshot in one transaction.
async function saveDraft({
  pageKey, language, title, slug, content, seo, visibility, effectiveAt, changeNote, adminId,
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cmsPage.findUnique({
      where: { pageKey_language: { pageKey, language } },
    });

    const page = existing
      ? await tx.cmsPage.update({
          where: { id: existing.id },
          data: {
            title,
            slug,
            content,
            seo: seo ?? existing.seo,
            visibility: visibility ?? existing.visibility,
            effectiveAt: effectiveAt ?? existing.effectiveAt,
            version: existing.version + 1,
            updatedById: adminId ?? undefined,
          },
        })
      : await tx.cmsPage.create({
          data: {
            pageKey,
            language,
            title,
            slug,
            content,
            seo: seo ?? {},
            visibility: visibility ?? {},
            effectiveAt: effectiveAt ?? null,
            status: "draft",
            version: 1,
            createdById: adminId ?? undefined,
            updatedById: adminId ?? undefined,
          },
        });

    await createRevision(tx, page, changeNote, adminId);
    return page;
  });
}

// Add / replace / remove ONE key inside content, leaving every other section alone.
// Returns null when the page row doesn't exist yet.
async function patchSection({ pageKey, language, sectionKey, data, remove, changeNote, adminId }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cmsPage.findUnique({
      where: { pageKey_language: { pageKey, language } },
    });
    if (!existing) return null;

    const content = { ...(existing.content || {}) };
    if (remove) {
      delete content[sectionKey];
    } else {
      content[sectionKey] = data;
    }

    const page = await tx.cmsPage.update({
      where: { id: existing.id },
      data: {
        content,
        version: existing.version + 1,
        updatedById: adminId ?? undefined,
      },
    });

    await createRevision(
      tx,
      page,
      changeNote || (remove ? `Removed section "${sectionKey}"` : `Updated section "${sectionKey}"`),
      adminId
    );
    return page;
  });
}

// seo / visibility only — content is untouched, so no revision snapshot needed.
function updateSettings({ pageId, seo, visibility, adminId }) {
  const data = { updatedById: adminId ?? undefined };
  if (seo !== undefined) data.seo = seo;
  if (visibility !== undefined) data.visibility = visibility;
  return prisma.cmsPage.update({ where: { id: pageId }, data });
}

async function publish({ pageId, adminId, changeNote }) {
  return prisma.$transaction(async (tx) => {
    const page = await tx.cmsPage.update({
      where: { id: pageId },
      data: {
        status: "published",
        publishedAt: new Date(),
        version: { increment: 1 },
        updatedById: adminId ?? undefined,
      },
    });

    await createRevision(tx, page, changeNote || "Published", adminId);
    return page;
  });
}

async function updateStatus({ pageId, status, adminId }) {
  return prisma.cmsPage.update({
    where: { id: pageId },
    data: { status, updatedById: adminId ?? undefined },
  });
}

function listRevisions({ pageId, page, limit }) {
  const skip = (page - 1) * limit;
  return prisma.$transaction([
    prisma.cmsPageRevision.findMany({
      where: { pageId },
      select: revisionSelect,
      orderBy: { version: "desc" },
      skip,
      take: limit,
    }),
    prisma.cmsPageRevision.count({ where: { pageId } }),
  ]);
}

function findRevisionById(pageId, revisionId) {
  return prisma.cmsPageRevision.findFirst({
    where: { id: BigInt(revisionId), pageId },
  });
}

// Restoring is just another save: copy the old revision's content/title into
// a brand-new revision on top of the stack — history is never rewritten.
async function restoreRevision({ pageId, revision, adminId }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.cmsPage.findUnique({ where: { id: pageId } });

    const page = await tx.cmsPage.update({
      where: { id: pageId },
      data: {
        title: revision.title,
        content: revision.content,
        version: current.version + 1,
        updatedById: adminId ?? undefined,
      },
    });

    await createRevision(tx, page, `Restored from v${revision.version}`, adminId);
    return page;
  });
}

module.exports = {
  findByKey,
  findPublishedByKey,
  list,
  saveDraft,
  patchSection,
  updateSettings,
  publish,
  updateStatus,
  listRevisions,
  findRevisionById,
  restoreRevision,
};