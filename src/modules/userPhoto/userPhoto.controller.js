const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./userPhoto.service");

const list = asyncHandler(async (req, res) => {
  const photos = await service.listPhotos(req.user.id);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { photos }, "Photos fetched"));
});

const add = asyncHandler(async (req, res) => {
  const photos = await service.addPhotos(req.user.id, req.files);
  res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { photos }, "Photos uploaded"));
});

const remove = asyncHandler(async (req, res) => {
  await service.removePhoto(req.user.id, req.params.id);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Photo deleted"));
});

module.exports = { list, add, remove };