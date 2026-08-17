// Deliberately thin: all the actual logic (serialization, validation,
// not-found checks) already lives in ../users/users.service.js — this just
// scopes every call to `req.user.id` (from the OTP-issued token) instead of
// an arbitrary :id param, so a user can only ever act on their own account.
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const usersService = require("../users/users.service");

const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.user.id);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { user }));
});

const updateMe = asyncHandler(async (req, res) => {
  // updatedById is null — this is a self-edit, not an admin acting on the user.
  const user = await usersService.updateUser(req.user.id, req.body, null);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, { user }, "Profile updated successfully"));
});

const deleteMe = asyncHandler(async (req, res) => {
  await usersService.deleteUser(req.user.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, "Account deleted successfully"));
});

module.exports = { getMe, updateMe, deleteMe };