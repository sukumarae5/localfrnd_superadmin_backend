const { HTTP_STATUS } = require("../../constants");
const ApiResponse = require("../../utils/apiresponse.util");
const userInterestService = require("./userInterest.service");

const getOptions = async (req, res, next) => {
  try {
    const options = await userInterestService.getSelectableInterests();
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, options, "Interest options fetched"));
  } catch (err) {
    next(err);
  }
};

const getMine = async (req, res, next) => {
  try {
    const interests = await userInterestService.getMyInterests(req.user.id);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, interests, "Your interests fetched"));
  } catch (err) {
    next(err);
  }
};

const setMine = async (req, res, next) => {
  try {
    const interests = await userInterestService.setMyInterests(req.user.id, req.body.interestCategoryPublicIds);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, interests, "Interests updated"));
  } catch (err) {
    next(err);
  }
};

module.exports = { getOptions, getMine, setMine };
