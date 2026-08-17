// verifications.controller.js
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./verifications.service");

async function list(req, res, next) {
  try {
    const result = await service.listRequests(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const request = await service.getByRequestCode(req.params.requestCode);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { request }));
  } catch (err) { next(err); }
}

async function decide(req, res, next) {
  try {
    const request = await service.decide(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { request }, "Decision recorded"));
  } catch (err) { next(err); }
}

async function flag(req, res, next) {
  try {
    const result = await service.flagUser(req.params.id, req.body.flagged);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) { next(err); }
}

// verifications.controller.js — submit() only, rest unchanged

async function submit(req, res, next) {
  try {
    const files = {
      selfieUrl: getFileUrl(req.files?.selfie?.[0]),
      idFrontUrl: getFileUrl(req.files?.idFront?.[0]),
      idBackUrl: getFileUrl(req.files?.idBack?.[0]),
    };

    // req.user comes from authenticateUser — the caller can only submit
    // KYC for themselves, never an arbitrary userId from the body.
    const result = await service.submitVerification(req.user.id, req.body, files);
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, { request: result }, "Verification submitted"));
  } catch (err) { next(err); }
}
// If your storage middleware is disk/multer -> file.path (then you'd serve it
// via a static URL). If it's multer-s3 / cloudinary -> file.location or file.url.
function getFileUrl(file) {
  if (!file) return null;
  return file.location || file.url || file.path || null;
}

// Webhook endpoint your AI/OCR provider (or an internal worker) calls back.
async function aiResults(req, res, next) {
  try {
    const request = await service.applyAiResults(req.params.requestCode, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { request }, "AI results applied"));
  } catch (err) { next(err); }
}


module.exports = { list, getOne, decide, flag , submit, aiResults};