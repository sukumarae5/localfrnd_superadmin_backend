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

// Upserts the page row AND writes a revision snapshot in one transaction —
// a page and its history must never disagree about what was actually saved.
async function saveDraft({ pageKey, language, title, slug, content, effectiveAt, changeNote, adminId }) {
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
            effectiveAt: effectiveAt ?? null,
            status: "draft",
            version: 1,
            createdById: adminId ?? undefined,
            updatedById: adminId ?? undefined,
          },
        });

    await tx.cmsPageRevision.create({
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

    return page;
  });
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

    await tx.cmsPageRevision.create({
      data: {
        pageId: page.id,
        version: page.version,
        title: page.title,
        content: page.content,
        status: page.status,
        changeNote: changeNote || "Published",
        createdById: adminId ?? undefined,
      },
    });

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

    await tx.cmsPageRevision.create({
      data: {
        pageId: page.id,
        version: page.version,
        title: page.title,
        content: page.content,
        status: page.status,
        changeNote: `Restored from v${revision.version}`,
        createdById: adminId ?? undefined,
      },
    });

    return page;
  });
}

module.exports = {
  findByKey,
  findPublishedByKey,
  list,
  saveDraft,
  publish,
  updateStatus,
  listRevisions,
  findRevisionById,
  restoreRevision,
};