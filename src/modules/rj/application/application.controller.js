// src/modules/rj/application/application.controller.js
const ApiResponse = require("../../../utils/apiresponse.util");
const ApiError = require("../../../utils/apiError.util");

const { HTTP_STATUS } = require("../../../constants");
const service = require("./application.service");

async function list(req, res, next) {
  try {
    const result = await service.listApplications(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const application = await service.getByAppCode(req.params.appCode);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { application }));
  } catch (err) {
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const application = await service.submitApplication(req.body);
    res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, { application }, "Application submitted"));
  } catch (err) {
    next(err);
  }
}

async function addDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Document file is required"
      );
    }

    const cloudinary = require("../../../config/cloudinary");

    const folder =
      process.env.CLOUDINARY_KYC_FOLDER || "lokalfrnd/kyc";

    const publicId = `${req.params.id}_${req.file.fieldname}_${Date.now()}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "image",
          type: "authenticated",
          format: "jpg",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    const application = await service.addDocument(
      req.params.id,
      {
        docType: req.body.docType,
        docUrl: result.secure_url,
      }
    );

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { application },
          "Document uploaded"
        )
      );
  } catch (err) {
    next(err);
  }
}

async function aiResults(req, res, next) {
  try {
    const application = await service.applyAiResults(req.params.appCode, req.body);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { application }, "AI results applied"));
  } catch (err) {
    next(err);
  }
}

async function decide(req, res, next) {
  try {
    const application = await service.decide(req.params.id, req.body, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { application }, "Decision recorded"));
  } catch (err) {
    next(err);
  }
}

async function requestDocs(req, res, next) {
  try {
    const application = await service.requestDocs(req.params.id, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { application }, "Documents requested"));
  } catch (err) {
    next(err);
  }
}

async function scheduleInterview(req, res, next) {
  try {
    const application = await service.scheduleInterview(req.params.id, req.admin.adminId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { application }, "Interview scheduled"));
  } catch (err) {
    next(err);
  }
}

async function updatePriority(req, res, next) {
  try {
    const application = await service.updatePriority(req.params.id, req.body.priority);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { application }, "Priority updated"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  submit,
  addDocument,
  aiResults,
  decide,
  requestDocs,
  scheduleInterview,
  updatePriority,
};