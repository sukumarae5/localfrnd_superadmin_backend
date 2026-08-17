const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const repo = require("./language.repository");

function serializeLanguage(lang) {
  return {
    id: lang.id,
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
    type: lang.type,
    isActive: lang.isActive,
    isDefault: lang.isDefault,
    supportedFeatures: {
      voiceCalls: lang.supportsVoiceCalls,
      videoCalls: lang.supportsVideoCalls,
      onboarding: lang.supportsOnboarding,
      inAppChat: lang.supportsInAppChat,
    },
    usersCount: lang._count?.userLanguages ?? 0,
    rjsCount: lang._count?.rjLanguages ?? 0, // will read 0 until the RJ relation is wired up
    createdAt: lang.createdAt,
    updatedAt: lang.updatedAt,
  };
}

async function listLanguages() {
  const languages = await repo.listLanguages();
  return languages.map(serializeLanguage);
}

async function getLanguageById(id) {
  const lang = await repo.findById(id);
  if (!lang) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
  return serializeLanguage(lang);
}

async function createLanguage(payload) {
  const { code, isDefault, ...rest } = payload;

  const existing = await repo.findByCode(code);
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, `A language with code "${code}" already exists`);
  }

  const lang = await repo.createLanguage({ code, ...rest });

  // isDefault on create goes through the atomic swap so we never end up
  // with two defaults
  if (isDefault) {
    const updated = await repo.setDefaultLanguage(lang.id);
    return serializeLanguage(updated);
  }

  return serializeLanguage(lang);
}

async function updateLanguage(id, updates) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");

  if (updates.code && updates.code !== existing.code) {
    const codeTaken = await repo.findByCode(updates.code);
    if (codeTaken) {
      throw new ApiError(HTTP_STATUS.CONFLICT, `A language with code "${updates.code}" already exists`);
    }
  }

  const { isDefault, ...rest } = updates;

  let lang = existing;
  if (Object.keys(rest).length > 0) {
    lang = await repo.updateLanguage(id, rest);
  }

  if (isDefault === true) {
    lang = await repo.setDefaultLanguage(id);
  } else if (isDefault === false && existing.isDefault) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Cannot unset the default language directly — set another language as default instead"
    );
  }

  return serializeLanguage(lang);
}

async function updateStatus(id, isActive) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");

  if (existing.isDefault && isActive === false) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Cannot deactivate the default language");
  }

  const lang = await repo.updateStatus(id, isActive);
  return serializeLanguage(lang);
}

async function deleteLanguage(id) {
  const existing = await repo.findById(id);
  if (!existing) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");

  if (existing.isDefault) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Cannot delete the default language — set another language as default first");
  }

  const { userCount, adminCount } = await repo.countUsage(id);
  if (userCount > 0 || adminCount > 0) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      `Cannot delete "${existing.name}" — it's currently assigned to ${userCount} user(s) and ${adminCount} admin(s). Reassign or remove those first.`
    );
  }

  await repo.deleteLanguage(id);
}

module.exports = {
  listLanguages,
  getLanguageById,
  createLanguage,
  updateLanguage,
  updateStatus,
  deleteLanguage,
};