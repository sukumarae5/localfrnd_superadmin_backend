const {
  HTTP_STATUS,
} = require("../../constants");

const ApiResponse = require(
  "../../utils/apiresponse.util"
);

const service = require(
  "./lifestyleCategory.service"
);

async function createCategory(
  req,
  res,
  next
) {
  try {
    const data =
      await service.createCategory(
        req.body,
        req.admin?.adminId
      );

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          data,
          "Lifestyle category created successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getCategories(
  req,
  res,
  next
) {
  try {
    const data =
      await service.getCategories(
        req.query
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyle categories fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getCategory(
  req,
  res,
  next
) {
  try {
    const data =
      await service.getCategory(
        req.params.publicId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyle category fetched successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function updateCategory(
  req,
  res,
  next
) {
  try {
    const data =
      await service.updateCategory(
        req.params.publicId,
        req.body,
        req.admin?.adminId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          data,
          "Lifestyle category updated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(
  req,
  res,
  next
) {
  try {
    await service.deleteCategory(
      req.params.publicId
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          null,
          "Lifestyle category deleted successfully"
        )
      );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};