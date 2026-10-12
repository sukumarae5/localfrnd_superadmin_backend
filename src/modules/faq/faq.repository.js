const { prisma } = require("../../config/database");

const defaultInclude = {
  category: { select: { publicId: true, displayCode: true, name: true } },
};

async function create(categoryId, data) {
  return prisma.faq.create({
    data: { ...data, categoryId: BigInt(categoryId) },
    include: defaultInclude,
  });
}

async function findByPublicId(publicId) {
  return prisma.faq.findFirst({
    where: { publicId, deletedAt: null },
    include: defaultInclude,
  });
}

async function findCategoryByPublicId(publicId) {
  return prisma.faqCategory.findFirst({ where: { publicId, deletedAt: null } });
}

async function list(filters, { page, limit, sortBy, sortDir }) {
  const where = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.language) where.language = filters.language;
  if (filters.categoryPublicId) where.category = { publicId: filters.categoryPublicId, deletedAt: null };
  if (filters.search) {
    where.OR = [
      { question: { contains: filters.search, mode: "insensitive" } },
      { answer: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.faq.findMany({ where, include: defaultInclude, orderBy: { [sortBy]: sortDir }, skip, take: limit }),
    prisma.faq.count({ where }),
  ]);

  return { items, total };
}

// Public (app) consumption — published only, grouped implicitly by category
// via the include; no pagination, this is a "load the whole FAQ screen" call.
async function listPublished(filters) {
  const where = { status: "published", deletedAt: null, language: filters.language };
  if (filters.categoryPublicId) where.category = { publicId: filters.categoryPublicId, deletedAt: null };
  if (filters.search) {
    where.OR = [
      { question: { contains: filters.search, mode: "insensitive" } },
      { answer: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.faq.findMany({
    where,
    include: defaultInclude,
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
}

async function update(id, data) {
  return prisma.faq.update({ where: { id: BigInt(id) }, data, include: defaultInclude });
}

async function softDelete(id) {
  return prisma.faq.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date(), status: "hidden" } });
}

module.exports = { create, findByPublicId, findCategoryByPublicId, list, listPublished, update, softDelete };