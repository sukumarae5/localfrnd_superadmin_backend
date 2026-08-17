// src/modules/userAvatar/userAvatar.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./userAvatar.service");

const listAvatars = asyncHandler(async (req, res) => {
  const avatars = await service.listAvatarsForUser(req.query.gender);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { avatars }));
});

const selectAvatar = asyncHandler(async (req, res) => {
  const profile = await service.selectAvatar(req.user.id, req.body.avatarId);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { profile }, "Avatar selected"));
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const profile = await service.uploadCustomAvatar(req.user.id, req.file);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { profile }, "Profile photo uploaded"));
});

const removeAvatar = asyncHandler(async (req, res) => {
  const profile = await service.removeCustomAvatar(req.user.id);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { profile }, "Custom photo removed"));
});

module.exports = { listAvatars, selectAvatar, uploadAvatar, removeAvatar };