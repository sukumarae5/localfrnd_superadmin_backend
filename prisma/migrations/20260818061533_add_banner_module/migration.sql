-- CreateEnum
CREATE TYPE "banner_type" AS ENUM ('PROMOTIONAL', 'HOME');

-- CreateEnum
CREATE TYPE "banner_category" AS ENUM ('COIN_OFFER', 'PREMIUM', 'REFERRAL', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "banner_position" AS ENUM ('TOP_SLIDER', 'MIDDLE_BANNER', 'BOTTOM_BANNER');

-- CreateEnum
CREATE TYPE "banner_platform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "banner_audience" AS ENUM ('ALL_USERS', 'NEW_USERS', 'EXISTING_USERS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "banner_status" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "banners" (
    "id" BIGSERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "display_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "banner_type" "banner_type" NOT NULL,
    "category" "banner_category" NOT NULL DEFAULT 'OTHER',
    "position" "banner_position",
    "image_url" TEXT NOT NULL,
    "image_public_id" TEXT NOT NULL,
    "image_width" INTEGER DEFAULT 1080,
    "image_height" INTEGER DEFAULT 608,
    "platforms" "banner_platform"[] DEFAULT ARRAY['ANDROID', 'IOS']::"banner_platform"[],
    "audience" "banner_audience" NOT NULL DEFAULT 'ALL_USERS',
    "audience_filter_days" INTEGER,
    "region" TEXT NOT NULL DEFAULT 'GLOBAL',
    "deep_link" TEXT,
    "campaign_value" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" "banner_status" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "impressions_count" BIGINT NOT NULL DEFAULT 0,
    "clicks_count" BIGINT NOT NULL DEFAULT 0,
    "conversions_count" BIGINT NOT NULL DEFAULT 0,
    "created_by_admin_id" BIGINT,
    "updated_by_admin_id" BIGINT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "banner_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "performed_by_admin_id" BIGINT,
    "performed_by_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banner_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banners_public_id_key" ON "banners"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "banners_display_code_key" ON "banners"("display_code");

-- CreateIndex
CREATE INDEX "banners_banner_type_status_idx" ON "banners"("banner_type", "status");

-- CreateIndex
CREATE INDEX "banners_category_idx" ON "banners"("category");

-- CreateIndex
CREATE INDEX "banners_status_start_at_end_at_idx" ON "banners"("status", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "banner_audit_logs_banner_id_idx" ON "banner_audit_logs"("banner_id");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_audit_logs" ADD CONSTRAINT "banner_audit_logs_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "banners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_audit_logs" ADD CONSTRAINT "banner_audit_logs_performed_by_admin_id_fkey" FOREIGN KEY ("performed_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
