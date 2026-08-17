const { prisma } = require("../../config/database");

function listLanguages() {
  return prisma.language.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          userLanguages: true,
          // rjLanguages: true, // <-- uncomment once RJ↔Language relation is confirmed
        },
      },
    },
  });
}

function findById(id) {
  return prisma.language.findUnique({
    where: { id: Number(id) },
    include: {
      _count: {
        select: {
          userLanguages: true,
          // rjLanguages: true,
        },
      },
    },
  });
}

function findByCode(code) {
  return prisma.language.findUnique({ where: { code } });
}

function createLanguage(data) {
  return prisma.language.create({ data });
}

function updateLanguage(id, data) {
  return prisma.language.update({ where: { id: Number(id) }, data });
}

function deleteLanguage(id) {
  return prisma.language.delete({ where: { id: Number(id) } });
}

// Only one language can be the default at a time — clear the current
// default (if any) and set the new one atomically.
function setDefaultLanguage(id) {
  return prisma.$transaction(async (tx) => {
    await tx.language.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    return tx.language.update({
      where: { id: Number(id) },
      data: { isDefault: true },
    });
  });
}

function updateStatus(id, isActive) {
  return prisma.language.update({ where: { id: Number(id) }, data: { isActive } });
}

// Used to block deletion of a language that's still assigned to users/admins,
// so we can give a clear error instead of letting the FK constraint fail raw.
async function countUsage(id) {
  const [userCount, adminCount] = await prisma.$transaction([
    prisma.userLanguage.count({ where: { languageId: Number(id) } }),
    prisma.admin.count({ where: { languageId: Number(id) } }),
  ]);
  return { userCount, adminCount };
}

module.exports = {
  listLanguages,
  findById,
  findByCode,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  setDefaultLanguage,
  updateStatus,
  countUsage,
};