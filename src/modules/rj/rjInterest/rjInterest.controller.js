const { HTTP_STATUS } = require("../../../constants");
const ApiResponse = require("../../../utils/apiresponse.util");
const rjInterestService = require("./rjInterest.service");

const assign = async (req, res, next) => {
  try {
    const result = await rjInterestService.assignRjToCategory(
      req.body.rjId,
      req.body.interestCategoryPublicId,
      req.admin?.adminId
    );
    return res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, result, "RJ assigned to interest"));
  } catch (err) {
    next(err);
  }
};

const unassign = async (req, res, next) => {
  try {
    await rjInterestService.unassignRjFromCategory(req.params.rjId, req.params.categoryPublicId);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "RJ unassigned from interest"));
  } catch (err) {
    next(err);
  }
};

const getRjsForCategory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await rjInterestService.getRjsForCategory(req.params.categoryPublicId, { page, limit });
    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { items: result.items, meta: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) || 1 } },
        "Assigned RJs fetched"
      )
    );
  } catch (err) {
    next(err);
  }
};

const setMine = async (req, res, next) => {
  try {
    const result = await rjInterestService.setMyInterests(req.rj.id, req.body.interestCategoryPublicIds);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Your interests updated"));
  } catch (err) {
    next(err);
  }
};

const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await rjInterestService.getRecommendedRjsForUser(req.user.id, req.query.limit);
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, recommendations, "Recommended RJs fetched"));
  } catch (err) {
    next(err);
  }
};

module.exports = { assign, unassign, getRjsForCategory, setMine, getRecommendations };
