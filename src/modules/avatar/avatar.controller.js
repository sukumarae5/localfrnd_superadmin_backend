// src/modules/avatar/avatar.controller.js
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./avatar.service");

async function list(req, res, next) {
  try { res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, await service.listAvatars(req.query))); }
  catch (err) { next(err); }
}
async function getOne(req, res, next) {
  try { res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { avatar: await service.getAvatarById(req.params.id) })); }
  catch (err) { next(err); }
}
async function create(req, res, next) {
  try {
    const avatar = await service.createAvatar(req.body, req.file, req.admin.adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { avatar }, "Avatar created"));
  } catch (err) { next(err); }
}
async function update(req, res, next) {
  try {
    const avatar = await service.updateAvatar(req.params.id, req.body, req.file, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { avatar }, "Avatar updated"));
  } catch (err) { next(err); }
}
async function remove(req, res, next) {
  try {
    const result = await service.deleteAvatar(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Avatar deleted"));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };