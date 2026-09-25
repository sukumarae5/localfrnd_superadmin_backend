const {
  HTTP_STATUS,
} = require("../../constants");

const ApiResponse = require(
  "../../utils/apiresponse.util"
);

const service = require(
  "./userLifestyle.service"
);

/**
 * GET /user-lifestyles/options
 *
 * Returns all active categories
 * with their lifestyle options.
 */
async function getOptions(
  req,
  res,
  next
) {
  try {
    const data =
      await service.getSelectableLifestyles();

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyle options fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /user-lifestyles/me
 *
 * Returns current user's selected
 * lifestyles.
 */
async function getMine(
  req,
  res,
  next
) {
  try {
    const data =
      await service.getMyLifestyles(
        req.user.id
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Your lifestyles fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /user-lifestyles/me
 *
 * Replace user's selected lifestyles.
 */
async function setMine(
  req,
  res,
  next
) {
  try {
    const data =
      await service.setMyLifestyles(
        req.user.id,
        req.body.lifestylePublicIds
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyles updated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOptions,
  getMine,
  setMine,
};