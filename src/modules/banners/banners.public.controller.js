const service = require("./banners.service");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

async function getActiveBanners(req, res, next) {
  try {
    const banners = await service.getActiveBanners(req.query);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, banners, "Active banners fetched successfully"));
  } catch (error) {
    return next(error);
  }
}

async function trackImpression(req, res, next) {
  try {
    const result = await service.trackImpression(req.params.publicId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result, "Impression tracked"));
  } catch (error) {
    return next(error);
  }
}

async function trackClick(req, res, next) {
  try {
    const result = await service.trackClick(req.params.publicId);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result, "Click tracked"));
  } catch (error) {
    return next(error);
  }
}

module.exports = { getActiveBanners, trackImpression, trackClick };