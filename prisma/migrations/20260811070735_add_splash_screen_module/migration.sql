/*
  Warnings:

  - A unique constraint covering the columns `[public_id]` on the table `rj_payouts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[display_code]` on the table `rj_payouts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `display_code` to the `rj_payouts` table without a default value. This is not possible if the table is not empty.
  - The required column `public_id` was added to the `rj_payouts` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updated_at` to the `rj_payouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `withdrawable_balance` to the `rj_payouts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "splash_screen_type" AS ENUM ('welcome', 'promo', 'other');

-- CreateEnum
CREATE TYPE "splash_platform" AS ENUM ('ios', 'android', 'all');

-- CreateEnum
CREATE TYPE "splash_priority" AS ENUM ('p1', 'p2', 'p3');

-- CreateEnum
CREATE TYPE "splash_status" AS ENUM ('draft', 'scheduled', 'active', 'expired');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "rj_payout_status" ADD VALUE 'approved';
ALTER TYPE "rj_payout_status" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "rj_payouts" ADD COLUMN     "appeal_message" TEXT,
ADD COLUMN     "appeal_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "appeal_reviewed_by" BIGINT,
ADD COLUMN     "appeal_status" "appeal_status",
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "bank_account_masked" VARCHAR(30),
ADD COLUMN     "display_code" VARCHAR(20) NOT NULL,
ADD COLUMN     "ifsc_code" VARCHAR(15),
ADD COLUMN     "is_high_priority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "public_id" UUID NOT NULL,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejection_code" VARCHAR(30),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "risk_flags" JSONB,
ADD COLUMN     "risk_score" DECIMAL(5,2),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verification_checklist" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "verification_pct" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "vpa" VARCHAR(150),
ADD COLUMN     "withdrawable_balance" DECIMAL(14,2) NOT NULL;

-- CreateTable
CREATE TABLE "splash_screens" (
    "id" BIGSERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "display_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "screen_type" "splash_screen_type" NOT NULL,
    "campaign" TEXT,
    "platform" "splash_platform" NOT NULL DEFAULT 'all',
    "app_version" TEXT,
    "priority" "splash_priority" NOT NULL DEFAULT 'p3',
    "status" "splash_status" NOT NULL DEFAULT 'draft',
    "thumbnail_url" TEXT,
    "thumbnail_cloudinary_id" TEXT,
    "resolution_w" INTEGER,
    "resolution_h" INTEGER,
    "duration_sec" DECIMAL(5,2),
    "size_kb" INTEGER,
    "format" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "total_views" BIGINT NOT NULL DEFAULT 0,
    "created_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "splash_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "splash_screen_activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "splash_screen_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" "splash_status",
    "to_status" "splash_status",
    "note" TEXT,
    "performed_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "splash_screen_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "splash_screen_daily_views" (
    "id" BIGSERIAL NOT NULL,
    "splash_screen_id" BIGINT NOT NULL,
    "view_date" DATE NOT NULL,
    "view_count" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "splash_screen_daily_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "splash_screens_public_id_key" ON "splash_screens"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "splash_screens_display_code_key" ON "splash_screens"("display_code");

-- CreateIndex
CREATE INDEX "splash_screens_status_idx" ON "splash_screens"("status");

-- CreateIndex
CREATE INDEX "splash_screens_screen_type_idx" ON "splash_screens"("screen_type");

-- CreateIndex
CREATE INDEX "splash_screens_platform_idx" ON "splash_screens"("platform");

-- CreateIndex
CREATE INDEX "splash_screens_deleted_at_idx" ON "splash_screens"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "splash_screen_activity_logs_public_id_key" ON "splash_screen_activity_logs"("public_id");

-- CreateIndex
CREATE INDEX "splash_screen_activity_logs_splash_screen_id_idx" ON "splash_screen_activity_logs"("splash_screen_id");

-- CreateIndex
CREATE UNIQUE INDEX "splash_screen_daily_views_splash_screen_id_view_date_key" ON "splash_screen_daily_views"("splash_screen_id", "view_date");

-- CreateIndex
CREATE UNIQUE INDEX "rj_payouts_public_id_key" ON "rj_payouts"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "rj_payouts_display_code_key" ON "rj_payouts"("display_code");

-- CreateIndex
CREATE INDEX "rj_payouts_status_created_at_idx" ON "rj_payouts"("status", "created_at");

-- AddForeignKey
ALTER TABLE "rj_payouts" ADD CONSTRAINT "rj_payouts_appeal_reviewed_by_fkey" FOREIGN KEY ("appeal_reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splash_screens" ADD CONSTRAINT "splash_screens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splash_screen_activity_logs" ADD CONSTRAINT "splash_screen_activity_logs_splash_screen_id_fkey" FOREIGN KEY ("splash_screen_id") REFERENCES "splash_screens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splash_screen_activity_logs" ADD CONSTRAINT "splash_screen_activity_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splash_screen_daily_views" ADD CONSTRAINT "splash_screen_daily_views_splash_screen_id_fkey" FOREIGN KEY ("splash_screen_id") REFERENCES "splash_screens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
