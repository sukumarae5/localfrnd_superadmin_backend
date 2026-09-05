-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('coin_purchase', 'subscription', 'rj_tip');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('initiated', 'authorized', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "payment_gateway_name" AS ENUM ('razorpay', 'phonepe', 'cashfree', 'paytm');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- DropForeignKey
ALTER TABLE "recharge_offer_audit_logs" DROP CONSTRAINT "recharge_offer_audit_logs_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "recharge_offer_redemptions" DROP CONSTRAINT "recharge_offer_redemptions_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "recharge_offer_redemptions" DROP CONSTRAINT "recharge_offer_redemptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recharge_plan_audit_logs" DROP CONSTRAINT "recharge_plan_audit_logs_plan_id_fkey";

-- AlterTable
ALTER TABLE "recharge_offers" ALTER COLUMN "public_id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "payment_type" NOT NULL,
    "gateway" "payment_gateway_name" NOT NULL,
    "gateway_ref" VARCHAR(150),
    "order_id" VARCHAR(100),
    "gateway_payment_id" VARCHAR(100),
    "base_amount" DECIMAL(12,2) NOT NULL,
    "gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "payment_status" NOT NULL DEFAULT 'initiated',
    "payment_method" "payment_method",
    "coin_transaction_id" BIGINT,
    "subscription_id" BIGINT,
    "coin_package_id" INTEGER,
    "failure_code" VARCHAR(50),
    "failure_reason" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorized_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateway_configs" (
    "id" BIGSERIAL NOT NULL,
    "gateway" "payment_gateway_name" NOT NULL,
    "merchant_id" VARCHAR(100) NOT NULL,
    "environment" VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    "api_key_encrypted" TEXT,
    "webhook_secret_encrypted" TEXT,
    "webhook_status" VARCHAR(20) NOT NULL DEFAULT 'disconnected',
    "emi_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_refund_enabled" BOOLEAN NOT NULL DEFAULT false,
    "smart_retry_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateway_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "requested_amount" DECIMAL(12,2) NOT NULL,
    "approved_amount" DECIMAL(12,2),
    "reason" TEXT NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "requested_by" BIGINT,
    "resolved_by" BIGINT,
    "resolution_note" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_logs" (
    "id" BIGSERIAL NOT NULL,
    "trace_id" VARCHAR(50) NOT NULL,
    "request_id" VARCHAR(50) NOT NULL,
    "endpoint" VARCHAR(150) NOT NULL,
    "gateway" "payment_gateway_name" NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "level" VARCHAR(10) NOT NULL DEFAULT 'info',
    "raw_payload" JSONB NOT NULL,
    "payment_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_public_id_key" ON "payments"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_display_code_key" ON "payments"("display_code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_payment_id_key" ON "payments"("gateway_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_coin_transaction_id_key" ON "payments"("coin_transaction_id");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_gateway_idx" ON "payments"("gateway");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_configs_gateway_key" ON "payment_gateway_configs"("gateway");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_public_id_key" ON "refunds"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_display_code_key" ON "refunds"("display_code");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_payment_id_idx" ON "payment_webhook_logs"("payment_id");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_gateway_event_type_idx" ON "payment_webhook_logs"("gateway", "event_type");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_created_at_idx" ON "payment_webhook_logs"("created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_coin_transaction_id_fkey" FOREIGN KEY ("coin_transaction_id") REFERENCES "coin_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_coin_package_id_fkey" FOREIGN KEY ("coin_package_id") REFERENCES "coin_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_gateway_configs" ADD CONSTRAINT "payment_gateway_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_offer_redemptions" ADD CONSTRAINT "recharge_offer_redemptions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "recharge_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_offer_redemptions" ADD CONSTRAINT "recharge_offer_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_offer_audit_logs" ADD CONSTRAINT "recharge_offer_audit_logs_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "recharge_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_plan_audit_logs" ADD CONSTRAINT "recharge_plan_audit_logs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "recharge_offer_audit_logs_offerId_idx" RENAME TO "recharge_offer_audit_logs_offer_id_idx";

-- RenameIndex
ALTER INDEX "recharge_offer_redemptions_offerId_createdAt_idx" RENAME TO "recharge_offer_redemptions_offer_id_created_at_idx";

-- RenameIndex
ALTER INDEX "recharge_offer_redemptions_userId_idx" RENAME TO "recharge_offer_redemptions_user_id_idx";

-- RenameIndex
ALTER INDEX "recharge_offers_offerType_idx" RENAME TO "recharge_offers_offer_type_idx";

-- RenameIndex
ALTER INDEX "recharge_offers_status_startAt_endAt_idx" RENAME TO "recharge_offers_status_start_at_end_at_idx";

-- RenameIndex
ALTER INDEX "recharge_plan_audit_logs_planId_idx" RENAME TO "recharge_plan_audit_logs_plan_id_idx";

-- RenameIndex
ALTER INDEX "subscription_plans_isActive_isDraft_idx" RENAME TO "subscription_plans_is_active_is_draft_idx";

-- RenameIndex
ALTER INDEX "subscription_plans_planType_idx" RENAME TO "subscription_plans_plan_type_idx";

-- RenameIndex
ALTER INDEX "user_subscriptions_offerId_idx" RENAME TO "user_subscriptions_offer_id_idx";

-- RenameIndex
ALTER INDEX "user_subscriptions_planId_createdAt_idx" RENAME TO "user_subscriptions_plan_id_created_at_idx";
