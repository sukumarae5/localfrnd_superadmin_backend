const ApiResponse = require("../../utils/apiresponse.util");

const { HTTP_STATUS } = require("../../constants");

const service = require("./coinPackage.service");

async function list(req, res, next) {
  try {
    const result = await service.listCoinPackages(req.query);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const coinPackage = await service.getCoinPackageById(req.params.id);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { coinPackage }));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const coinPackage = await service.createCoinPackage(req.body, req.admin.adminId);

    res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, { coinPackage }, "Coin package created successfully"));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const coinPackage = await service.updateCoinPackage(req.params.id, req.body, req.admin.adminId);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { coinPackage }, "Coin package updated successfully"));
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const coinPackage = await service.updatePackageStatus(req.params.id, req.body.status, req.admin.adminId);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { coinPackage }, "Coin package status updated"));
  } catch (error) {
    next(error);
  }
}

async function updatePopular(req, res, next) {
  try {
    const coinPackage = await service.updatePackagePopular(req.params.id, req.body.isPopular, req.admin.adminId);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { coinPackage }, "Popular package updated"));
  } catch (error) {
    next(error);
  }
}

async function reorder(req, res, next) {
  try {
    const packages = await service.reorderCoinPackages(req.body.packages, req.admin.adminId);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { packages }, "Coin packages reordered successfully"));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await service.deleteCoinPackage(req.params.id);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result, "Coin package deleted successfully"));
  } catch (error) {
    next(error);
  }
}

async function listActive(req, res, next) {
  try {
    const packages = await service.getActiveCoinPackages();

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { packages }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  updateStatus,
  updatePopular,
  reorder,
  remove,
  listActive,
};