const service = require("./offers.service");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

async function list(req, res, next) {
  try {
    const result = await service.listOffers(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Offers fetched successfully"));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const offer = await service.getOfferDetails(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, offer, "Offer fetched successfully"));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const offer = await service.createOffer(req.body, req.file, adminId);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, offer, "Offer created successfully"));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const offer = await service.updateOffer(req.params.publicId, req.body, req.file, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, offer, "Offer updated successfully"));
  } catch (err) { next(err); }
}

async function changeStatus(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const { status, note } = req.body;
    const offer = await service.changeStatus(req.params.publicId, status, note, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, offer, "Offer status updated"));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    await service.deleteOffer(req.params.publicId, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Offer deleted successfully"));
  } catch (err) { next(err); }
}

async function bulkChangeStatus(req, res, next) {
  try {
    const adminId = req.admin.adminId;
    const results = await service.bulkChangeStatus(req.body.publicIds, req.body.status, adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, results, "Bulk status update completed"));
  } catch (err) { next(err); }
}

async function dashboard(req, res, next) {
  try {
    const result = await service.getDashboard();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Dashboard fetched successfully"));
  } catch (err) { next(err); }
}

async function trackClick(req, res, next) {
  try {
    const result = await service.trackClick(req.params.publicId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Click tracked"));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, changeStatus, remove, bulkChangeStatus, dashboard, trackClick };