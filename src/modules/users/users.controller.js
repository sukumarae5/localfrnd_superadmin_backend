// src/modules/users/users.controller.js
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const userService = require("./users.service");

async function list(req, res, next) {
  try {
    const result = await userService.listUsers(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { user }));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser({ ...req.body, createdById: req.admin.adminId });
    res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, { user }, "User created successfully"));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { user }, "User updated successfully"));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const user = await userService.changeStatus(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { user }, "User status updated"));
  } catch (err) {
    next(err);
  }
}



async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "User deleted successfully"));
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const note = await userService.addNote(req.params.id, req.body.note, req.admin.adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { note }, "Note added"));
  } catch (err) {
    next(err);
  }
}

async function listNotes(req, res, next) {
  try {
    const notes = await userService.listNotes(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { notes }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  updateStatus,
  remove,
  addNote,
  listNotes,
};