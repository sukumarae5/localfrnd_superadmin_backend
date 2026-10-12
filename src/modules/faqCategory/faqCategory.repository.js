const { prisma } = require("../../config/database");

const DISPLAY_CODE_PREFIX = "FC";

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateDisplayCode(tx) {
  const count = await tx.faqCategory.count();
  let attempt = count + 1;

  for (let i = 0; i < 100; i++) {
    const candidate = `${DISPLAY_CODE_PREFIX}-${String(attempt).padStart(3, "0")}`;
    const exists = await tx.faqCategory.findUnique({ where: { displayCode: candidate }, select: { id: true } });
    if (!exists) return candidate;
    attempt++;
  }

  throw new Error("Unable to generate unique FAQ category display code");
}

const defaultInclude = {
  _count: { select: { faqs: true } },
};

async function create(data) {
  return prisma.$transaction(async (tx) => {
    const displayCode = await generateDisplayCode(tx);
    let slug = slugify(data.name);

    const existing = await tx.faqCategory.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    return tx.faqCategory.create({
      data: { ...data, displayCode, slug },
      include: defaultInclude,
    });
  });
}

async function findByPublicId(publicId) {
  return prisma.faqCategory.findFirst({
    where: { publicId, deletedAt: null },
    include: {
      ...defaultInclude,
      faqs: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
    },
  });
}

async function list(filters, { page, limit, sortBy, sortDir }) {
  const where = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { displayCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.faqCategory.findMany({ where, include: defaultInclude, orderBy: { [sortBy]: sortDir }, skip, take: limit }),
    prisma.faqCategory.count({ where }),
  ]);

  return { items, total };
}

// Public (app) consumption — active categories only, no pagination (this is
// a small lookup list for a filter UI, same shape as GET /user-interests/options).
async function listActive() {
  return prisma.faqCategory.findMany({
    where: { status: "active", deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { publicId: true, name: true, slug: true, icon: true, sortOrder: true },
  });
}

async function update(id, data) {
  return prisma.faqCategory.update({ where: { id: BigInt(id) }, data, include: defaultInclude });
}

async function softDelete(id) {
  return prisma.faqCategory.update({
    where: { id: BigInt(id) },
    data: { deletedAt: new Date(), status: "inactive" },
  });
}

module.exports = { create, findByPublicId, list, listActive, update, softDelete, slugify };