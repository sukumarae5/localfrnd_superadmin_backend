// src/modules/users/users.service.js
const crypto = require("crypto");
const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const { ONLINE_THRESHOLD_MINUTES } = require("./users.constants");
const repo = require("./users.repository");

// Public-facing user code shown in the admin UI, e.g. "LF-9F3A21B7"
function generateDisplayCode() {
  return `LF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function parseDateOfBirth(value) {
  if (!value) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Date of birth is required");
  }

  let date;

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = new Date(value);
  }
  // yyyy/mm/dd
  else if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
    date = new Date(value.replace(/\//g, "-"));
  }
  // dd-mm-yyyy
  else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split("-");
    date = new Date(`${year}-${month}-${day}`);
  }
  // dd/mm/yyyy
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    date = new Date(`${year}-${month}-${day}`);
  } else {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Invalid date format"
    );
  }

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Invalid date of birth"
    );
  }

  const today = new Date();

  let age = today.getFullYear() - date.getFullYear();

  const month = today.getMonth() - date.getMonth();

  if (
    month < 0 ||
    (month === 0 && today.getDate() < date.getDate())
  ) {
    age--;
  }

  if (age < 18) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "You must be at least 18 years old."
    );
  }

  return date;
}

// --- active vs online -------------------------------------------------------
// `status` (active/inactive/suspended/blocked) is an admin-controlled account
// state — it doesn't change until an admin (or a rule) changes it.
// "Online" is a real-time presence signal — is this person using the app
// *right now*. They're independent: a user can be `status: active` but
// offline (not currently using the app), or `status: suspended` and still
// technically connected until their session is force-closed.
//
// This computes "online" from `lastActiveAt` (already in your schema) —
// zero new infrastructure, ships immediately. It's an approximation: it's as
// fresh as however often your mobile app pings lastActiveAt.
// For true real-time presence (updates the instant someone opens/closes the
// app), the standard approach is Socket.io connect/disconnect events writing
// an ephemeral key into Redis (`SET online:<userId> 1 EX 60`), which fits
// your existing Socket.io + Upstash setup — happy to wire that in separately
// if you want it more precise than this.
function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  const thresholdMs = ONLINE_THRESHOLD_MINUTES * 60 * 1000;
  return Date.now() - new Date(lastActiveAt).getTime() < thresholdMs;
}

function serializeUser(user) {
  return {
    id: user.id.toString(),
    publicId: user.publicId,
    displayCode: user.displayCode,
    fullName: user.fullName,
    email: user.email,
    mobileCountryCode: user.mobileCountryCode,
    mobileNumber: user.mobileNumber,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    country: user.country,
    state: user.state,
    city: user.city,
    locality: user.locality,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
    verificationStatus: user.verificationStatus,
    verifiedAt: user.verifiedAt,
    verifiedByName: user.verifiedBy?.fullName || null,
    subscription: user.currentSubscription?.displayName || null,
    wallet: user.wallet
      ? { balance: user.wallet.balance, coins: user.wallet.coins.toString() }
      : null,
    languages: user.languages?.map((l) => l.language.name) || undefined,
    recentStatusHistory: user.statusHistory?.map((h) => ({
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    totalCallsCount: user.totalCallsCount,
    registeredAt: user.registeredAt,
    lastLoginAt: user.lastLoginAt,
    lastActiveAt: user.lastActiveAt,
    isOnline: isOnline(user.lastActiveAt),
  };
}

async function assertLanguagesExist(languageIds) {
  const found = await repo.findLanguagesByIds(languageIds);
  if (found.length !== languageIds.length) {
    const foundIds = found.map((l) => l.id);
    const missing = languageIds.filter((id) => !foundIds.includes(id));
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown language id(s): ${missing.join(", ")}`);
  }
}

async function listUsers(query) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const sortBy = query.sortBy || "registeredAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);

  const { users, total } = await repo.listUsers({
    page,
    limit,
    search: query.search,
    status: query.status,
    verificationStatus: query.verificationStatus,
    onlineOnly: query.onlineOnly,
    onlineThreshold,
    sortBy,
    sortOrder,
  });

  return {
    users: users.map(serializeUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getUserById(id) {
  const user = await repo.findById(id);
  if (!user || user.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  return serializeUser(user);
}

async function createUser({
  fullName,
  mobileCountryCode,
  mobileNumber,
  email,
  gender,
  dateOfBirth,
  country,
  state,
  city,
  locality,
  bio,
  avatarUrl,
  languageIds,
  createdById,
}) {
  const existingMobile = await repo.findByMobile(mobileCountryCode, mobileNumber);
  if (existingMobile) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "A user with this mobile number already exists");
  }

  if (email) {
    const existingEmail = await repo.findByEmail(email);
    if (existingEmail) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "A user with this email already exists");
    }
  }

  if (languageIds?.length) {
    await assertLanguagesExist(languageIds);
  }

  const created = await repo.createUser({
    displayCode: generateDisplayCode(),
    fullName,
    mobileCountryCode,
    mobileNumber,
    email: email || null,
    gender: gender || null,
dateOfBirth: parseDateOfBirth(dateOfBirth),
    country: country || null,
    state: state || null,
    city: city || null,
      bio: bio || null,
  avatarUrl: avatarUrl || null,
    locality: locality || null,
    createdById: createdById ? BigInt(createdById) : null,
  });

  if (languageIds?.length) {
    await repo.setUserLanguages(created.id, languageIds);
  }

  const user = await repo.findById(created.id);
  return serializeUser(user);
}

async function updateUser(id, updates, updatedById) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  if (updates.email && updates.email !== existing.email) {
    const emailTaken = await repo.findByEmail(updates.email);
    if (emailTaken) throw new ApiError(HTTP_STATUS.CONFLICT, "A user with this email already exists");
  }

  // languageIds isn't a column on `users` — it's handled separately via UserLanguage
  const { languageIds, ...profileFields } = updates;

  if (languageIds) {
    await assertLanguagesExist(languageIds);
    await repo.setUserLanguages(id, languageIds);
  }

  await repo.updateUser(id, {
    ...profileFields,
dateOfBirth: profileFields.dateOfBirth
  ? parseDateOfBirth(profileFields.dateOfBirth)
  : undefined,
      updatedById: updatedById ? BigInt(updatedById) : null,
  });

  const user = await repo.findById(id);
  return serializeUser(user);
}

async function changeStatus(id, { status, reason }, changedById) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  if (existing.status === status) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `User is already ${status}`);
  }

  await repo.createStatusHistory({
    userId: existing.id,
    previousStatus: existing.status,
    newStatus: status,
    reason: reason || null,
    changedById: changedById ? BigInt(changedById) : null,
  });

  const user = await repo.updateStatus(id, status);
  return serializeUser(user);
}



async function deleteUser(id) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  await repo.softDeleteUser(id);
}

async function addNote(id, note, adminId) {
  const existing = await repo.findById(id);
  if (!existing || existing.deletedAt) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

  const created = await repo.createNote({ userId: BigInt(id), adminId: BigInt(adminId), note });

  return {
    id: created.id.toString(),
    note: created.note,
    adminName: created.admin.fullName,
    createdAt: created.createdAt,
  };
}

async function listNotes(id) {
  const notes = await repo.listNotes(id);
  return notes.map((n) => ({
    id: n.id.toString(),
    note: n.note,
    adminName: n.admin.fullName,
    createdAt: n.createdAt,
  }));
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  changeStatus,
  deleteUser,
  addNote,
  listNotes,
};