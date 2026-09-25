const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
const authRoutes = require("../modules/auth/auth.routes");
const userRoutes = require("../modules/users/users.routes");
const languageRoutes = require("../modules/language/language.routes");
const verificationRoutes = require("../modules/verifications/verifications.routes");
const moderationRoutes = require("../modules/moderation/moderation.routes");
const plansRoutes = require("../modules/plans/plans.routes");
const offersRoutes = require("../modules/offers/offers.routes");
const walletRoutes = require("../modules/wallet/wallet.routes");
const activityRoutes = require("../modules/activity/activity.routes");
const feedbackRoutes = require("../modules/feedback/feedback.routes");
const userAuthRoutes = require("../modules/userAuth/userAuth.routes");
const userProfileRoutes = require("../modules/userProfile/userProfile.routes");
const rjProfileRoutes = require("../modules/rj/profile/rj.routes");
const {
  adminApplicationRouter,
  userApplicationRouter,
} = require("../modules/rj/application/application.routes");
const {
  rjRingsRouter,
  adminRingSettingsRouter,
} = require("../modules/rj/rings/rings.routes");
const rjStatusRoutes = require("../modules/rj/status/status.routes");
const rjEarningsRoutes = require("../modules/rj/earnings/earnings.routes");
const rjReviewRoutes = require("../modules/rj/reviews/review.routes");
const rjPerformanceRoutes = require("../modules/rj/performance/performance.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const interestCategoryRoutes = require("../modules/interestCategory/interestCategory.routes");
const userInterestRoutes = require("../modules/userInterest/userInterest.routes");
const rjInterestRoutes = require("../modules/rj/rjInterest/rjInterest.routes");
const avatarRoutes = require("../modules/avatar/avatar.routes");
const userAvatarRoutes = require("../modules/userAvatar/userAvatar.routes");
const withdrawalRoutes = require("../modules/withdrawal/withdrawal.routes");
const splashScreenRoutes = require("../modules/splashscreen/splashScreen.routes");
const bannersRoutes = require("../modules/banners/banners.routes");
const bannersPublicRoutes = require("../modules/banners/banners.public.routes");
const bankAccountRoutes = require("../modules/bankaccount/bankaccount.routes");
const coinPackageRoutes = require("../modules/coinPackage/coinPackage.routes");
const coinTransactionRoutes = require("../modules/coinTransaction/coinTransaction.routes");
const userCoinRoutes = require("../modules/coinTransaction/userCoin.routes");
const paymentsRoutes = require("../modules/payments/payments.routes");
const paymentGatewayRoutes = require("../modules/paymentGateway/paymentGateway.routes");
const refundsRoutes = require("../modules/refunds/refunds.routes");
const paymentLogsRoutes = require("../modules/paymentLogs/paymentLogs.routes");
const paymentWebhookRoutes = require("../modules/paymentWebhook/paymentWebhook.routes");
const presenceRoutes = require("../modules/presence/presence.routes");
const {
  rjCallsRouter,
  userCallsRouter,
  adminCallsRouter,
} = require("../modules/calls/calls.routes");
const { userFriendsRouter, rjFriendsRouter } = require("../modules/friends/friends.routes");
const { userNotificationsRouter, rjNotificationsRouter } = require("../modules/notifications/notification.routes");
const { userChatRouter, rjChatRouter } = require("../modules/chat/chat.routes");
const lifestyleCategoryRoutes = require("../modules/lifestyleCategory/lifestyleCategory.routes");

const lifestyleRoutes = require("../modules/lifestyle/lifestyle.routes");

const userLifestyleRoutes = require("../modules/userLifestyle/userLifestyle.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/admins", adminRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/language", languageRoutes);
router.use("/verification", verificationRoutes);
router.use("/moderation", moderationRoutes);
router.use("/plans", plansRoutes);
router.use("/wallet", walletRoutes);
router.use("/activity", activityRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/admin/interest-categories", interestCategoryRoutes);
router.use("/user-interests", userInterestRoutes);
router.use("/rj-interests", rjInterestRoutes);
router.use("/user/auth", userAuthRoutes);
router.use("/user/profile", userProfileRoutes);
router.use("/rj/calls", rjCallsRouter);
// These three MUST be registered before router.use("/rj", rjProfileRoutes)
// below. Express's router.use(path, ...) matches by prefix, so "/rj" alone
// would otherwise swallow every "/rj/friends/...", "/rj/notifications/..."
// and "/rj/chat/..." request first (running rjProfileRoutes' admin-only
// `authenticate` middleware before this router even gets a chance) — the
// exact bug that made /rj/friends/* and /rj/chat/* 401 with the ADMIN
// "Invalid or expired access token" error even though a real, valid RJ
// token was being sent. /rj/calls above was already correctly positioned
// ahead of "/rj" for the same reason; these just weren't.
router.use("/rj/friends", rjFriendsRouter);
router.use("/rj/notifications", rjNotificationsRouter);
router.use("/rj/chat", rjChatRouter);
router.use("/rj", rjProfileRoutes);
router.use("/rj-applications", adminApplicationRouter);
router.use("/user/rj-applications", userApplicationRouter);
router.use("/rj/rings", rjRingsRouter);
router.use("/admin/rj-ring-settings", adminRingSettingsRouter);
router.use("/rj-status", rjStatusRoutes);
router.use("/rj-earnings", rjEarningsRoutes);
router.use("/rj-review", rjReviewRoutes);
router.use("/rj-performance", rjPerformanceRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/avatars", avatarRoutes);
router.use("/user", userAvatarRoutes);
router.use("/splash-screens", splashScreenRoutes);
router.use("/admin/banners", bannersRoutes);
router.use("/public/banners", bannersPublicRoutes);
router.use("/rj/bank-accounts", bankAccountRoutes);
router.use("/coin-transactions", coinTransactionRoutes);
router.use("/coin-packages", coinPackageRoutes);
router.use("/user/coins", userCoinRoutes);
router.use("/recharge-offers", offersRoutes);
router.use("/payments", paymentsRoutes);
router.use("/payment-gateways", paymentGatewayRoutes);
router.use("/refunds", refundsRoutes);
router.use("/payment-logs", paymentLogsRoutes);
router.use("/webhooks", paymentWebhookRoutes);
router.use("/presence", presenceRoutes);
router.use("/user/calls", userCallsRouter);
router.use("/admin/calls", adminCallsRouter);
router.use("/user/friends", userFriendsRouter);
router.use("/user/notifications", userNotificationsRouter);
router.use("/user/chat", userChatRouter);
router.use("/admin/lifestyle-categories", lifestyleCategoryRoutes);

router.use("/admin/lifestyles", lifestyleRoutes);

router.use("/user-lifestyles", userLifestyleRoutes);

module.exports = router;