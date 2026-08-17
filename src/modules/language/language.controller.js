const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const languageService = require("./language.service");

async function list(req, res, next) {
  try {
    const languages = await languageService.listLanguages();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { languages }));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const language = await languageService.getLanguageById(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { language }));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const language = await languageService.createLanguage(req.body);
    res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, { language }, "Language created successfully"));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const language = await languageService.updateLanguage(req.params.id, req.body);
    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { language }, "Language updated successfully"));
  } catch (err) {
    next(err);
  }
}

// Powers the "Deactivate" / "Activate" button in the details panel
async function updateStatus(req, res, next) {
  try {
    const language = await languageService.updateStatus(req.params.id, req.body.isActive);
    const message = req.body.isActive ? "Language activated" : "Language deactivated";
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { language }, message));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await languageService.deleteLanguage(req.params.id);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Language deleted successfully"));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, updateStatus, remove };
