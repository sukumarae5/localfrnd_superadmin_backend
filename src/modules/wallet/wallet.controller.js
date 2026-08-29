const ApiResponse = require("../../utils/apiresponse.util");

const { HTTP_STATUS } = require("../../constants");

const service = require("./wallet.service");


async function list(req, res, next) {
  try {
    const result = await service.listWallets(
      req.query
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result
        )
      );

  } catch (err) {
    next(err);
  }
}


async function getOne(req, res, next) {
  try {
    const wallet =
      await service.getWalletDetail(
        req.params.userId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { wallet }
        )
      );

  } catch (err) {
    next(err);
  }
}


async function transactions(req, res, next) {
  try {
    const result =
      await service.listTransactions(
        req.params.userId,
        req.query
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result
        )
      );

  } catch (err) {
    next(err);
  }
}


async function credit(req, res, next) {
  try {

    const result =
      await service.creditWallet(
        req.params.userId,
        req.body,
        req.admin.adminId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          "Wallet credited"
        )
      );

  } catch (err) {
    next(err);
  }
}


async function debit(req, res, next) {
  try {

    const result =
      await service.debitWallet(
        req.params.userId,
        req.body,
        req.admin.adminId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          "Wallet debited"
        )
      );

  } catch (err) {
    next(err);
  }
}


async function freeze(req, res, next) {
  try {

    const result =
      await service.setFrozen(
        req.params.userId,
        req.body.isFrozen,
        req.admin.adminId
      );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          result.isFrozen
            ? "Wallet frozen"
            : "Wallet unfrozen"
        )
      );

  } catch (err) {
    next(err);
  }
}


/*
|--------------------------------------------------------------------------
| CREATE MY WALLET
|--------------------------------------------------------------------------
|
| The user ID comes from the authenticated JWT.
|
*/

async function createMyWallet(req, res, next) {
  try {
    const userId = req.user.id;

    const wallet = await service.createMyWallet(
      userId
    );

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          wallet,
          "Wallet created successfully"
        )
      );

  } catch (err) {
    next(err);
  }
}


module.exports = {
  list,
  getOne,
  transactions,
  credit,
  debit,
  freeze,
  createMyWallet,
};