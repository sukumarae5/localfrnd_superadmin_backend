// src/modules/avatar/avatar.constants.js
const AVATAR_GENDERS = ["male", "female", "unisex"];
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CLOUDINARY_AVATAR_FOLDER = process.env.CLOUDINARY_AVATAR_FOLDER || "lokalfrnd/avatars";

module.exports = { AVATAR_GENDERS, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, CLOUDINARY_AVATAR_FOLDER };