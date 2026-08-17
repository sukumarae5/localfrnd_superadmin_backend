// src/modules/splashscreen/splashScreen.controller.js
const service = require('./splashScreen.service');
const ApiResponse = require('../../utils/apiresponse.util'); // default export, not { ApiResponse }
const { HTTP_STATUS } = require('../../constants');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// req.admin comes from auth.middleware.js's authenticate(), payload shape { adminId, role }.
// Prisma's BigInt columns (createdById, performedById) need an actual BigInt.
const toAdminId = (req) => BigInt(req.admin.adminId);

const listSplashScreens = asyncHandler(async (req, res) => {
  const result = await service.listSplashScreens(req.query);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Splash screens fetched successfully'));
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await service.getStats();
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, stats, 'Stats fetched successfully'));
});

const getSplashScreenById = asyncHandler(async (req, res) => {
  const splash = await service.getSplashScreenById(req.params.id);
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, splash, 'Splash screen fetched successfully'));
});

const createSplashScreen = asyncHandler(async (req, res) => {
  const created = await service.createSplashScreen(req.body, req.file, toAdminId(req));
  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, created, 'Splash screen created successfully'));
});

const updateSplashScreen = asyncHandler(async (req, res) => {
  const updated = await service.updateSplashScreen(req.params.id, req.body, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, updated, 'Splash screen updated successfully'));
});

const deleteSplashScreen = asyncHandler(async (req, res) => {
  await service.deleteSplashScreen(req.params.id, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, 'Splash screen deleted successfully'));
});

const updateStatus = asyncHandler(async (req, res) => {
  const updated = await service.updateStatus(req.params.id, req.body, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, updated, 'Status updated successfully'));
});

const updateSchedule = asyncHandler(async (req, res) => {
  const updated = await service.updateSchedule(req.params.id, req.body, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, updated, 'Schedule updated successfully'));
});

const updatePriority = asyncHandler(async (req, res) => {
  const updated = await service.updatePriority(req.params.id, req.body, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, updated, 'Priority updated successfully'));
});

const bulkAction = asyncHandler(async (req, res) => {
  const results = await service.bulkAction(req.body, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, results, 'Bulk action processed'));
});

const uploadThumbnail = asyncHandler(async (req, res) => {
  const updated = await service.uploadThumbnail(req.params.id, req.file, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, updated, 'Thumbnail uploaded successfully'));
});

const removeThumbnail = asyncHandler(async (req, res) => {
  const updated = await service.removeThumbnail(req.params.id, toAdminId(req));
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, updated, 'Thumbnail removed successfully'));
});

const getDailyViews = asyncHandler(async (req, res) => {
  const data = await service.getDailyViews(req.params.id, req.query.range);
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, 'Daily views fetched successfully'));
});

const getTypeDistribution = asyncHandler(async (req, res) => {
  const data = await service.getTypeDistribution();
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, 'Type distribution fetched successfully'));
});

const getActivityTimeline = asyncHandler(async (req, res) => {
  const data = await service.getActivityTimeline(req.params.id, req.query);
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, 'Activity timeline fetched successfully'));
});

const getFilterMeta = asyncHandler(async (req, res) => {
  const data = service.getFilterMeta();
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, 'Filter metadata fetched successfully'));
});

module.exports = {
  listSplashScreens,
  getStats,
  getSplashScreenById,
  createSplashScreen,
  updateSplashScreen,
  deleteSplashScreen,
  updateStatus,
  updateSchedule,
  updatePriority,
  bulkAction,
  uploadThumbnail,
  removeThumbnail,
  getDailyViews,
  getTypeDistribution,
  getActivityTimeline,
  getFilterMeta,
};