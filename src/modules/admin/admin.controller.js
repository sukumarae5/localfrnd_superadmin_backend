const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./admin.service");

async function create(req, res, next) {
  try {
    const admin = await service.createAdmin({
      ...req.body,
      createdById: req.admin.adminId,
    });
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { admin }, "Admin created"));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.listAdmins({ page, limit });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const admin = await service.getAdmin(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { admin }));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const admin = await service.updateAdmin(req.params.publicId, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { admin }, "Admin updated"));
  } catch (err) {
    next(err);
  }
}

async function changeOwnPassword(req, res, next) {
  try {
    await service.changeOwnPassword({
      adminId: req.admin.adminId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, null, "Password updated. Please log in again."));
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    await service.resetAdminPassword({
      publicId: req.params.publicId,
      newPassword: req.body.newPassword,
    });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Password reset"));
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    await service.deactivateAdmin(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Admin deactivated"));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, changeOwnPassword, resetPassword, deactivate };