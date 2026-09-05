const ApiResponse =
  require("../../utils/apiresponse.util");

const {
  HTTP_STATUS,
} = require("../../constants");

const service =
  require("./coinTransaction.service");

async function list(req, res, next) {
  try {
    const result =
      await service.listCoinTransactions(
        req.query
      );

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getBalance(
  req,
  res,
  next
) {
  try {
    const userId =
      req.user.id;

    const balance =
      await service.getUserCoinBalance(
        userId
      );

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          balance
        )
      );
  } catch (error) {
    next(error);
  }
}

async function getMyTransactions(
  req,
  res,
  next
) {
  try {
    const userId =
      req.user.id;

    const result =
      await service.getUserTransactions(
        userId,
        req.query
      );

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result
        )
      );
  } catch (error) {
    next(error);
  }
}

async function initiatePurchase(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await service.initiateCoinPurchase(
      userId,
      req.body.coinPackageId
    );

    res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          result,
          "Razorpay order created"
        )
      );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getBalance,
  getMyTransactions,
  initiatePurchase,
};