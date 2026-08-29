-- Ensure gen_random_uuid() is available (built-in on Postgres 13+, this is a
-- harmless no-op there; needed as a fallback on older Postgres versions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "recharge_plan_type" AS ENUM ('normal', 'premium');

-- CreateEnum
CREATE TYPE "offer_type" AS ENUM ('FLASH_SALE', 'BONUS_COINS', 'CASHBACK', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "offer_discount_type" AS ENUM ('PERCENTAGE', 'FLAT', 'MULTIPLIER', 'BONUS_COINS');

-- CreateEnum
CREATE TYPE "offer_status" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- AlterTable: subscription_plans (Recharge Plans admin screens)
-- public_id is added nullable first, backfilled, then locked to NOT NULL —
-- gen_random_uuid() is volatile, so it must be split into 3 steps to safely
-- back-fill existing rows (this is what Postgres/Prisma were flagging).
ALTER TABLE "subscription_plans"
  ADD COLUMN "public_id" UUID,
  ADD COLUMN "display_code" VARCHAR(20),
  ADD COLUMN "short_description" VARCHAR(200),
  ADD COLUMN "detailed_description" TEXT,
  ADD COLUMN "plan_type" "recharge_plan_type" NOT NULL DEFAULT 'normal',
  ADD COLUMN "badge_text" VARCHAR(40),
  ADD COLUMN "icon_url" TEXT,
  ADD COLUMN "icon_public_id" TEXT,
  ADD COLUMN "banner_image_url" TEXT,
  ADD COLUMN "banner_image_public_id" TEXT,
  ADD COLUMN "theme_color" VARCHAR(9),
  ADD COLUMN "base_coins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bonus_coins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "validity_days" INTEGER,
  ADD COLUMN "display_priority" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_premium_badge" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cashback_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_draft" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "views_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "purchases_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refunds_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "revenue_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "created_by" BIGINT,
  ADD COLUMN "updated_by" BIGINT,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Backfill public_id and display_code for any pre-existing rows before
-- enforcing NOT NULL/UNIQUE
UPDATE "subscription_plans"
  SET "public_id" = gen_random_uuid()
  WHERE "public_id" IS NULL;

UPDATE "subscription_plans"
  SET "display_code" = 'RF-' || LPAD("id"::text, 4, '0')
  WHERE "display_code" IS NULL;

-- Now that every row has a value, lock public_id down to NOT NULL
ALTER TABLE "subscription_plans" ALTER COLUMN "public_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_public_id_key" ON "subscription_plans"("public_id");
CREATE UNIQUE INDEX "subscription_plans_display_code_key" ON "subscription_plans"("display_code");
CREATE INDEX "subscription_plans_isActive_isDraft_idx" ON "subscription_plans"("is_active", "is_draft");
CREATE INDEX "subscription_plans_planType_idx" ON "subscription_plans"("plan_type");

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: user_subscriptions (purchase ledger additions)
ALTER TABLE "user_subscriptions"
  ADD COLUMN "price_paid" DECIMAL(10,2),
  ADD COLUMN "payment_method" VARCHAR(30),
  ADD COLUMN "offer_id" BIGINT,
  ADD COLUMN "coupon_code" VARCHAR(30),
  ADD COLUMN "is_refunded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refunded_at" TIMESTAMP(3);

CREATE INDEX "user_subscriptions_planId_createdAt_idx" ON "user_subscriptions"("plan_id", "created_at");
CREATE INDEX "user_subscriptions_offerId_idx" ON "user_subscriptions"("offer_id");

-- CreateTable
CREATE TABLE "recharge_offers" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_code" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "offer_type" "offer_type" NOT NULL,
    "discount_type" "offer_discount_type" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "coupon_code" VARCHAR(30) NOT NULL,
    "banner_image_url" TEXT,
    "banner_image_public_id" TEXT,
    "applicable_to_all" BOOLEAN NOT NULL DEFAULT true,
    "applicable_plan_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "min_purchase_amount" DECIMAL(10,2),
    "max_redemptions" INTEGER,
    "max_redemptions_per_user" INTEGER DEFAULT 1,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "clicks_count" INTEGER NOT NULL DEFAULT 0,
    "redemptions_count" INTEGER NOT NULL DEFAULT 0,
    "revenue_generated" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus_coins_issued" BIGINT NOT NULL DEFAULT 0,
    "status" "offer_status" NOT NULL DEFAULT 'DRAFT',
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recharge_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_offer_redemptions" (
    "id" BIGSERIAL NOT NULL,
    "offer_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "subscription_id" BIGINT,
    "discount_applied" DECIMAL(10,2),
    "bonus_coins_given" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recharge_offer_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_offer_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "offer_id" BIGINT NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "note" TEXT,
    "performed_by_admin_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recharge_offer_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_plan_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "plan_id" SMALLINT NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "note" TEXT,
    "changes" JSONB,
    "performed_by_admin_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recharge_plan_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recharge_offers_public_id_key" ON "recharge_offers"("public_id");
CREATE UNIQUE INDEX "recharge_offers_display_code_key" ON "recharge_offers"("display_code");
CREATE UNIQUE INDEX "recharge_offers_coupon_code_key" ON "recharge_offers"("coupon_code");
CREATE INDEX "recharge_offers_status_idx" ON "recharge_offers"("status");
CREATE INDEX "recharge_offers_offerType_idx" ON "recharge_offers"("offer_type");
CREATE INDEX "recharge_offers_status_startAt_endAt_idx" ON "recharge_offers"("status", "start_at", "end_at");

CREATE UNIQUE INDEX "recharge_offer_redemptions_subscription_id_key" ON "recharge_offer_redemptions"("subscription_id");
CREATE INDEX "recharge_offer_redemptions_offerId_createdAt_idx" ON "recharge_offer_redemptions"("offer_id", "created_at");
CREATE INDEX "recharge_offer_redemptions_userId_idx" ON "recharge_offer_redemptions"("user_id");

CREATE INDEX "recharge_offer_audit_logs_offerId_idx" ON "recharge_offer_audit_logs"("offer_id");

CREATE INDEX "recharge_plan_audit_logs_planId_idx" ON "recharge_plan_audit_logs"("plan_id");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "recharge_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recharge_offers" ADD CONSTRAINT "recharge_offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recharge_offers" ADD CONSTRAINT "recharge_offers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recharge_offer_redemptions" ADD CONSTRAINT "recharge_offer_redemptions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "recharge_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recharge_offer_redemptions" ADD CONSTRAINT "recharge_offer_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recharge_offer_redemptions" ADD CONSTRAINT "recharge_offer_redemptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recharge_offer_audit_logs" ADD CONSTRAINT "recharge_offer_audit_logs_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "recharge_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recharge_offer_audit_logs" ADD CONSTRAINT "recharge_offer_audit_logs_performed_by_admin_id_fkey" FOREIGN KEY ("performed_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recharge_plan_audit_logs" ADD CONSTRAINT "recharge_plan_audit_logs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recharge_plan_audit_logs" ADD CONSTRAINT "recharge_plan_audit_logs_performed_by_admin_id_fkey" FOREIGN KEY ("performed_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;