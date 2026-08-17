-- CreateEnum
CREATE TYPE "rj_status" AS ENUM ('online', 'offline', 'busy', 'on_call');

-- CreateEnum
CREATE TYPE "rj_tier" AS ENUM ('silver', 'gold', 'platinum');

-- CreateEnum
CREATE TYPE "rj_application_status" AS ENUM ('pending', 'under_review', 'interview_pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "rj_doc_type" AS ENUM ('aadhaar', 'pan', 'biometric', 'bank', 'email', 'mobile');

-- CreateEnum
CREATE TYPE "rj_doc_verification_method" AS ENUM ('ai', 'manual');

-- CreateEnum
CREATE TYPE "rj_priority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "offline_reason" AS ENUM ('scheduled_break', 'logged_out', 'unexpected');

-- CreateEnum
CREATE TYPE "call_status" AS ENUM ('ongoing', 'completed', 'missed', 'dropped');

-- CreateEnum
CREATE TYPE "call_quality" AS ENUM ('poor', 'average', 'good', 'excellent');

-- CreateEnum
CREATE TYPE "rj_wallet_txn_type" AS ENUM ('call_earning', 'bonus', 'referral', 'commission', 'withdrawal');

-- CreateEnum
CREATE TYPE "rj_payout_status" AS ENUM ('pending', 'processing', 'success', 'failed');

-- CreateEnum
CREATE TYPE "review_sentiment" AS ENUM ('positive', 'neutral', 'negative');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('published', 'flagged', 'removed');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" VARCHAR(500);

-- CreateTable
CREATE TABLE "rj_categories" (
    "id" SMALLSERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "rj_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_category_map" (
    "rj_id" BIGINT NOT NULL,
    "category_id" SMALLINT NOT NULL,

    CONSTRAINT "rj_category_map_pkey" PRIMARY KEY ("rj_id","category_id")
);

-- CreateTable
CREATE TABLE "rjs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "tier" "rj_tier" NOT NULL DEFAULT 'silver',
    "status" "rj_status" NOT NULL DEFAULT 'offline',
    "verification_status" "verification_status" NOT NULL DEFAULT 'unverified',
    "verified_at" TIMESTAMP(3),
    "verified_by" BIGINT,
    "experience_years" SMALLINT NOT NULL DEFAULT 0,
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.0,
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_calls_count" INTEGER NOT NULL DEFAULT 0,
    "avg_response_seconds" INTEGER,
    "current_app_id" BIGINT,
    "approved_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rjs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_status_history" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "previous_status" VARCHAR(30) NOT NULL,
    "new_status" VARCHAR(30) NOT NULL,
    "reason" TEXT,
    "changed_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_admin_notes" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "admin_id" BIGINT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rj_admin_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_applications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "app_code" VARCHAR(20) NOT NULL,
    "category_id" SMALLINT,
    "experience_years" SMALLINT NOT NULL DEFAULT 0,
    "status" "rj_application_status" NOT NULL DEFAULT 'pending',
    "priority" "rj_priority" NOT NULL DEFAULT 'medium',
    "aadhaar_match" BOOLEAN NOT NULL DEFAULT false,
    "pan_match" BOOLEAN NOT NULL DEFAULT false,
    "face_id_match_score" DECIMAL(5,2),
    "ai_suitability_score" DECIMAL(5,2),
    "communication_score" DECIMAL(5,2),
    "risk_score" DECIMAL(5,2),
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_application_documents" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "doc_type" "rj_doc_type" NOT NULL,
    "doc_url" TEXT NOT NULL,
    "verification_method" "rj_doc_verification_method" NOT NULL DEFAULT 'ai',
    "ai_confidence_score" DECIMAL(5,2),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_device_sessions" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "device_model" VARCHAR(100),
    "os_version" VARCHAR(50),
    "battery_pct" SMALLINT,
    "network_type" VARCHAR(20),
    "network_strength" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_ping_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "rj_device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_offline_logs" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "reason" "offline_reason" NOT NULL DEFAULT 'logged_out',
    "offline_since" TIMESTAMP(3) NOT NULL,
    "online_since" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_offline_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_call_sessions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" "call_status" NOT NULL DEFAULT 'ongoing',
    "quality" "call_quality",
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_secs" INTEGER,
    "coins_spent" BIGINT NOT NULL DEFAULT 0,
    "earnings_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_wallets" (
    "rj_id" BIGINT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_wallets_pkey" PRIMARY KEY ("rj_id")
);

-- CreateTable
CREATE TABLE "rj_wallet_transactions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "type" "rj_wallet_txn_type" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "call_session_id" BIGINT,
    "description" TEXT,
    "initiated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_payouts" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "rj_payout_status" NOT NULL DEFAULT 'pending',
    "method" "payment_method",
    "processed_by" BIGINT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_reviews" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "call_session_id" BIGINT,
    "rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "sentiment" "review_sentiment",
    "status" "review_status" NOT NULL DEFAULT 'published',
    "moderated_by" BIGINT,
    "moderated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_performance_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "calls_completed" INTEGER NOT NULL DEFAULT 0,
    "calls_missed" INTEGER NOT NULL DEFAULT 0,
    "avg_duration_secs" INTEGER,
    "call_quality_score" DECIMAL(5,2),
    "attendance_pct" DECIMAL(5,2),
    "csat_score" DECIMAL(5,2),
    "avg_response_secs" INTEGER,
    "perf_score" DECIMAL(5,2),
    "grade" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_badges" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "badge_name" VARCHAR(100) NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_activity_log" (
    "id" BIGSERIAL NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rj_categories_code_key" ON "rj_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rjs_user_id_key" ON "rjs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rjs_public_id_key" ON "rjs"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "rjs_display_code_key" ON "rjs"("display_code");

-- CreateIndex
CREATE UNIQUE INDEX "rjs_current_app_id_key" ON "rjs"("current_app_id");

-- CreateIndex
CREATE INDEX "rjs_status_idx" ON "rjs"("status");

-- CreateIndex
CREATE INDEX "rjs_verification_status_idx" ON "rjs"("verification_status");

-- CreateIndex
CREATE INDEX "rjs_tier_idx" ON "rjs"("tier");

-- CreateIndex
CREATE INDEX "rj_status_history_rj_id_created_at_idx" ON "rj_status_history"("rj_id", "created_at");

-- CreateIndex
CREATE INDEX "rj_admin_notes_rj_id_created_at_idx" ON "rj_admin_notes"("rj_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rj_applications_app_code_key" ON "rj_applications"("app_code");

-- CreateIndex
CREATE INDEX "rj_applications_status_idx" ON "rj_applications"("status");

-- CreateIndex
CREATE INDEX "rj_applications_priority_idx" ON "rj_applications"("priority");

-- CreateIndex
CREATE INDEX "rj_applications_submitted_at_idx" ON "rj_applications"("submitted_at");

-- CreateIndex
CREATE INDEX "rj_application_documents_application_id_idx" ON "rj_application_documents"("application_id");

-- CreateIndex
CREATE INDEX "rj_device_sessions_rj_id_is_active_idx" ON "rj_device_sessions"("rj_id", "is_active");

-- CreateIndex
CREATE INDEX "rj_offline_logs_rj_id_offline_since_idx" ON "rj_offline_logs"("rj_id", "offline_since");

-- CreateIndex
CREATE UNIQUE INDEX "rj_call_sessions_public_id_key" ON "rj_call_sessions"("public_id");

-- CreateIndex
CREATE INDEX "rj_call_sessions_rj_id_started_at_idx" ON "rj_call_sessions"("rj_id", "started_at");

-- CreateIndex
CREATE INDEX "rj_call_sessions_user_id_started_at_idx" ON "rj_call_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "rj_call_sessions_status_idx" ON "rj_call_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rj_wallet_transactions_public_id_key" ON "rj_wallet_transactions"("public_id");

-- CreateIndex
CREATE INDEX "rj_wallet_transactions_rj_id_created_at_idx" ON "rj_wallet_transactions"("rj_id", "created_at");

-- CreateIndex
CREATE INDEX "rj_wallet_transactions_type_idx" ON "rj_wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "rj_payouts_rj_id_status_idx" ON "rj_payouts"("rj_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rj_reviews_call_session_id_key" ON "rj_reviews"("call_session_id");

-- CreateIndex
CREATE INDEX "rj_reviews_rj_id_created_at_idx" ON "rj_reviews"("rj_id", "created_at");

-- CreateIndex
CREATE INDEX "rj_reviews_status_idx" ON "rj_reviews"("status");

-- CreateIndex
CREATE INDEX "rj_reviews_sentiment_idx" ON "rj_reviews"("sentiment");

-- CreateIndex
CREATE INDEX "rj_performance_snapshots_rj_id_snapshot_date_idx" ON "rj_performance_snapshots"("rj_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "rj_performance_snapshots_rj_id_snapshot_date_key" ON "rj_performance_snapshots"("rj_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "rj_badges_rj_id_idx" ON "rj_badges"("rj_id");

-- CreateIndex
CREATE INDEX "rj_activity_log_rj_id_created_at_idx" ON "rj_activity_log"("rj_id", "created_at");

-- AddForeignKey
ALTER TABLE "rj_category_map" ADD CONSTRAINT "rj_category_map_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_category_map" ADD CONSTRAINT "rj_category_map_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "rj_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rjs" ADD CONSTRAINT "rjs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rjs" ADD CONSTRAINT "rjs_current_app_id_fkey" FOREIGN KEY ("current_app_id") REFERENCES "rj_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rjs" ADD CONSTRAINT "rjs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rjs" ADD CONSTRAINT "rjs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rjs" ADD CONSTRAINT "rjs_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_status_history" ADD CONSTRAINT "rj_status_history_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_status_history" ADD CONSTRAINT "rj_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_admin_notes" ADD CONSTRAINT "rj_admin_notes_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_admin_notes" ADD CONSTRAINT "rj_admin_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_applications" ADD CONSTRAINT "rj_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_applications" ADD CONSTRAINT "rj_applications_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "rj_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_applications" ADD CONSTRAINT "rj_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_application_documents" ADD CONSTRAINT "rj_application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "rj_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_device_sessions" ADD CONSTRAINT "rj_device_sessions_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_offline_logs" ADD CONSTRAINT "rj_offline_logs_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_call_sessions" ADD CONSTRAINT "rj_call_sessions_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_call_sessions" ADD CONSTRAINT "rj_call_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_wallets" ADD CONSTRAINT "rj_wallets_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_wallet_transactions" ADD CONSTRAINT "rj_wallet_transactions_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_wallet_transactions" ADD CONSTRAINT "rj_wallet_transactions_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_payouts" ADD CONSTRAINT "rj_payouts_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_payouts" ADD CONSTRAINT "rj_payouts_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_reviews" ADD CONSTRAINT "rj_reviews_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_reviews" ADD CONSTRAINT "rj_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_reviews" ADD CONSTRAINT "rj_reviews_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "rj_call_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_reviews" ADD CONSTRAINT "rj_reviews_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_performance_snapshots" ADD CONSTRAINT "rj_performance_snapshots_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_badges" ADD CONSTRAINT "rj_badges_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_activity_log" ADD CONSTRAINT "rj_activity_log_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
