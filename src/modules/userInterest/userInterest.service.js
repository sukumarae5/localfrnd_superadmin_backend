const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");
const userInterestRepository = require("./userInterest.repository");

const getSelectableInterests = async () => userInterestRepository.listSelectable();

const getMyInterests = async (userId) => userInterestRepository.findByUserId(userId);

const setMyInterests = async (userId, publicIds) => {
  const categories = await userInterestRepository.findActivePublicByIds(publicIds);

  if (categories.length !== publicIds.length) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "One or more interest categories are invalid or inactive");
  }

  return userInterestRepository.replaceUserInterests(userId, categories.map((c) => c.id));
};

module.exports = { getSelectableInterests, getMyInterests, setMyInterests };