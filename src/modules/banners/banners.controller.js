const service = require("./banners.service");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

async function createBanner(req, res, next) {
  try {
const adminId = req.admin.adminId;
    const banner = await service.createBanner(req.body, req.file, adminId);
    return res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, banner, "Banner created successfully"));
  } catch (error) {
    return next(error);
  }
}

async function listBanners(req, res, next) {
  try {
    const result = await service.listBanners(req.query);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result, "Banners fetched successfully"));
  } catch (error) {
    return next(error);
  }
}

async function getBanner(req, res, next) {
  try {
    const banner = await service.getBannerDetails(req.params.publicId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banner, "Banner fetched successfully"));
  } catch (error) {
    return next(error);
  }
}

async function updateBanner(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const banner = await service.updateBanner(req.params.publicId, req.body, req.file, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banner, "Banner updated successfully"));
  } catch (error) {
    return next(error);
  }
}

async function changeStatus(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const { status, note } = req.body;
    const banner = await service.changeStatus(req.params.publicId, status, note, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banner, "Banner status updated successfully"));
  } catch (error) {
    return next(error);
  }
}

async function changePriority(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const banner = await service.changePriority(req.params.publicId, req.body.priority, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banner, "Banner priority updated successfully"));
  } catch (error) {
    return next(error);
  }
}

async function scheduleBanner(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const { startAt, endAt } = req.body;
    const banner = await service.scheduleBanner(req.params.publicId, startAt, endAt, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banner, "Banner scheduled successfully"));
  } catch (error) {
    return next(error);
  }
}

async function approveAssets(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const banner = await service.approveAssets(req.params.publicId, adminId, req.body.note);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banner, "Banner assets approved"));
  } catch (error) {
    return next(error);
  }
}

async function deleteBanner(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    await service.deleteBanner(req.params.publicId, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, null, "Banner deleted successfully"));
  } catch (error) {
    return next(error);
  }
}

async function bulkChangeStatus(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const results = await service.bulkChangeStatus(req.body.publicIds, req.body.status, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, results, "Bulk status update completed"));
  } catch (error) {
    return next(error);
  }
}

async function bulkDelete(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const results = await service.bulkDelete(req.body.publicIds, adminId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, results, "Bulk delete completed"));
  } catch (error) {
    return next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await service.getSummary(req.query.bannerType);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, summary, "Banner summary fetched successfully"));
  } catch (error) {
    return next(error);
  }
}

async function getEngagementDistribution(req, res, next) {
  try {
    const distribution = await service.getEngagementDistribution(req.query.bannerType);
    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, distribution, "Engagement distribution fetched successfully")
      );
  } catch (error) {
    return next(error);
  }
}

async function getTopPerforming(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 5;
    const top = await service.getTopPerforming(req.query.bannerType, limit);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, top, "Top performing banners fetched successfully"));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBanner,
  listBanners,
  getBanner,
  updateBanner,
  changeStatus,
  changePriority,
  scheduleBanner,
  approveAssets,
  deleteBanner,
  bulkChangeStatus,
  bulkDelete,
  getSummary,
  getEngagementDistribution,
  getTopPerforming,
};