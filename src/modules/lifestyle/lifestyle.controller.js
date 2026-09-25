const {
  HTTP_STATUS,
} = require("../../constants");

const ApiResponse = require(
  "../../utils/apiresponse.util"
);

const service = require(
  "./lifestyle.service"
);

async function createLifestyle(
  req,
  res,
  next
) {
  try {
    const data =
      await service.createLifestyle(
        req.body
      );

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          data,
          "Lifestyle created successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getLifestyles(
  req,
  res,
  next
) {
  try {
    const data =
      await service.getLifestyles(
        req.query
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyles fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getLifestyle(
  req,
  res,
  next
) {
  try {
    const data =
      await service.getLifestyle(
        req.params.publicId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyle fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function updateLifestyle(
  req,
  res,
  next
) {
  try {
    const data =
      await service.updateLifestyle(
        req.params.publicId,
        req.body
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyle updated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function deleteLifestyle(
  req,
  res,
  next
) {
  try {
    await service.deleteLifestyle(
      req.params.publicId
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          null,
          "Lifestyle deleted successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLifestyle,
  getLifestyles,
  getLifestyle,
  updateLifestyle,
  deleteLifestyle,
};