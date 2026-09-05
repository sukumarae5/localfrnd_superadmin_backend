const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");

const repo = require("./coinTransaction.repository");
const coinPackageRepo = require("../coinPackage/coinPackage.repository");
const paymentGatewayRepo = require("../paymentGateway/paymentGateway.repository");
const paymentsService = require("../payments/payments.service");
const razorpayClient = require("../../utils/razorpayClient.util");
const { decryptSecret } = require("../../utils/secretCipher.util");

function serializeTransaction(item) {
  return {
    id: item.id.toString(),
    publicId: item.publicId,

    userId: item.userId.toString(),

    coinPackageId: item.coinPackageId,

    type: item.type,
    status: item.status,

    coins: item.coins,
    bonusCoins: item.bonusCoins,
    totalCoins: item.totalCoins,

    amount: item.amount ? Number(item.amount) : null,

    currency: item.currency,

    paymentProvider: item.paymentProvider,
    paymentId: item.paymentId,
    paymentOrderId: item.paymentOrderId,

    metadata: item.metadata,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    user: item.user
      ? {
          id: item.user.id.toString(),
          publicId: item.user.publicId,
          fullName: item.user.fullName,
          mobile: `${item.user.mobileCountryCode}${item.user.mobileNumber}`,
        }
      : undefined,

    coinPackage: item.coinPackage ? item.coinPackage : undefined,
  };
}

async function listCoinTransactions(query) {
  const page = Number(query.page) || 1;

  const limit = Math.min(Number(query.limit) || 20, 100);

  const { transactions, total } = await repo.listTransactions({
    page,
    limit,
    userId: query.userId,
    coinPackageId: query.coinPackageId,
    type: query.type,
    status: query.status,
  });

  return {
    transactions: transactions.map(serializeTransaction),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
Coin balance lives on UserWallet, the same table
Plans/Offers purchases credit. There is no
coinBalance field on User.
*/

async function getUserCoinBalance(userId) {
  const wallet = await repo.getWalletByUserId(userId);

  if (!wallet) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this user");
  }

  return {
    coinBalance: wallet.coins.toString(),
    walletBalance: Number(wallet.balance),
  };
}

async function getUserTransactions(userId, query) {
  const page = Number(query.page) || 1;

  const limit = Math.min(Number(query.limit) || 20, 100);

  const { transactions, total } = await repo.findUserTransactions(userId, page, limit);

  return {
    transactions: transactions.map(serializeTransaction),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
This function should ONLY be called after payment
verification. For example, from a Razorpay webhook.

paymentMethod (optional) must be a valid
PaymentMethod enum value (upi | credit_card |
wallet | other) if you want this purchase to show
a payment method on the WalletTransaction row.
paymentProvider (e.g. "razorpay") is free text and
is stored on CoinTransaction only, since the enum
has no matching value for it yet.
*/

async function completePurchase({
  userId,
  coinPackageId,
  paymentProvider,
  paymentId,
  paymentOrderId,
  paymentMethod,
}) {
  const coinPackage = await coinPackageRepo.findById(coinPackageId);

  if (!coinPackage || coinPackage.deletedAt || coinPackage.status !== "active") {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Coin package not found");
  }

  // Prevent duplicate payment processing.
  if (paymentId) {
    const existing = await repo.findSuccessfulTransactionByPaymentId(paymentId);

    if (existing) {
      return {
        transaction: existing,
        alreadyProcessed: true,
      };
    }
  }

  try {
    const { transaction, wallet } = await repo.completePurchase({
      userId,
      coinPackage,
      paymentProvider,
      paymentId,
      paymentOrderId,
      paymentMethod,
    });

    return {
      transaction,
      wallet,
      alreadyProcessed: false,
    };
  } catch (error) {
    if (error.message === "WALLET_NOT_FOUND") {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Wallet not found for this user");
    }

    throw error;
  }
}

/*
User-facing entry point: creates a Razorpay order for a coin package and
an `initiated` Payment row to track it. The actual coin credit does NOT
happen here -- it happens in paymentWebhook.service.js once Razorpay
confirms the payment via webhook. Returns just enough for the client to
open Razorpay Checkout (order id + amount + the gateway's key id).
*/
async function initiateCoinPurchase(userId, coinPackageId) {
  const coinPackage = await coinPackageRepo.findById(coinPackageId);

  if (!coinPackage || coinPackage.deletedAt || coinPackage.status !== "active") {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Coin package not found");
  }

  const gatewayConfig = await paymentGatewayRepo.findByGateway("razorpay");

  if (!gatewayConfig || !gatewayConfig.isActive || !gatewayConfig.apiKeyEncrypted) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Razorpay is not configured or is inactive");
  }

  const keySecret = decryptSecret(gatewayConfig.apiKeyEncrypted);
  const totalAmount = Number(coinPackage.price);

  const order = await razorpayClient.createOrder({
    keyId: gatewayConfig.merchantId,
    keySecret,
    amountInPaise: Math.round(totalAmount * 100),
    currency: coinPackage.currency,
    receipt: `coin-${coinPackage.id}-${userId}-${Date.now()}`,
    notes: { userId: String(userId), coinPackageId: String(coinPackage.id) },
  });

  const payment = await paymentsService.recordInitiatedPayment({
    userId,
    type: "coin_purchase",
    gateway: "razorpay",
    orderId: order.id,
    baseAmount: totalAmount,
    gstAmount: 0,
    totalAmount,
    currency: coinPackage.currency,
    coinPackageId: coinPackage.id,
  });

  return {
    paymentDisplayCode: payment.displayCode,
    razorpayOrderId: order.id,
    razorpayKeyId: gatewayConfig.merchantId,
    amount: order.amount, // in paise, as Razorpay Checkout expects
    currency: order.currency,
  };
}

module.exports = {
  listCoinTransactions,
  getUserCoinBalance,
  getUserTransactions,
  completePurchase,
  initiateCoinPurchase,
};