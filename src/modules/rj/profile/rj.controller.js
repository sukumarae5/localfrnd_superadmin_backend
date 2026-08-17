// src/modules/rj/profile/rj.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../../constants");
const rjService = require("./rj.service");

async function list(req, res, next) {
  try {
    const result = await rjService.listRJs(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const rj = await rjService.getRJById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { rj }));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const rj = await rjService.updateRJ(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { rj }, "RJ updated successfully"));
  } catch (err) {
    next(err);
  }
}

async function updateAccountStatus(req, res, next) {
  try {
    const rj = await rjService.changeAccountStatus(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { rj }, "RJ account status updated"));
  } catch (err) {
    next(err);
  }
}

async function updatePresenceStatus(req, res, next) {
  try {
    const rj = await rjService.changePresenceStatus(req.params.id, req.body.status, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { rj }, "RJ presence status updated"));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await rjService.deleteRJ(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "RJ deleted successfully"));
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const note = await rjService.addNote(req.params.id, req.body.note, req.admin.adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { note }, "Note added"));
  } catch (err) {
    next(err);
  }
}

async function listNotes(req, res, next) {
  try {
    const notes = await rjService.listNotes(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { notes }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  update,
  updateAccountStatus,
  updatePresenceStatus,
  remove,
  addNote,
  listNotes,
};