// src/modules/cms/cms.controller.js
const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const service = require("./cms.service");

function toAdminId(req) {
  return req.admin?.adminId;
}

async function listPages(req, res, next) {
  try {
    const data = await service.listPages(req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "CMS pages fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function getPage(req, res, next) {
  try {
    const data = await service.getPage(req.params.pageKey, req.query.language);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "CMS page fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function saveDraft(req, res, next) {
  try {
    const data = await service.saveDraft(req.params.pageKey, req.body, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Draft saved successfully"));
  } catch (error) {
    next(error);
  }
}

async function patchSection(req, res, next) {
  try {
    const data = await service.patchSection(
      req.params.pageKey,
      req.params.sectionKey,
      req.body,
      toAdminId(req)
    );
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Section saved successfully"));
  } catch (error) {
    next(error);
  }
}

async function removeSection(req, res, next) {
  try {
    const data = await service.removeSection(
      req.params.pageKey,
      req.params.sectionKey,
      req.query.language,
      toAdminId(req)
    );
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Section removed successfully"));
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const data = await service.updateSettings(req.params.pageKey, req.body, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Page settings updated successfully"));
  } catch (error) {
    next(error);
  }
}

async function uploadImage(req, res, next) {
  try {
    const data = await service.uploadImage(req.params.pageKey, req.file);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Image uploaded successfully"));
  } catch (error) {
    next(error);
  }
}

async function publishPage(req, res, next) {
  try {
    const data = await service.publishPage(req.params.pageKey, req.body.language, req.body.changeNote, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Page published successfully"));
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await service.updatePageStatus(req.params.pageKey, req.body.language, req.body.status, toAdminId(req));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Page status updated successfully"));
  } catch (error) {
    next(error);
  }
}

async function listRevisions(req, res, next) {
  try {
    const data = await service.listRevisions(req.params.pageKey, req.query);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Revisions fetched successfully"));
  } catch (error) {
    next(error);
  }
}

async function restoreRevision(req, res, next) {
  try {
    const data = await service.restoreRevision(
      req.params.pageKey,
      req.params.revisionId,
      req.body.language,
      toAdminId(req)
    );
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Revision restored successfully"));
  } catch (error) {
    next(error);
  }
}

// ---- Public (app-facing) ----

async function getPublishedPage(req, res, next) {
  try {
    const data = await service.getPublishedPage(req.params.pageKey, req.query.language, req.query.platform);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, data, "Page fetched successfully"));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPages,
  getPage,
  saveDraft,
  patchSection,
  removeSection,
  updateSettings,
  uploadImage,
  publishPage,
  updateStatus,
  listRevisions,
  restoreRevision,
  getPublishedPage,
};