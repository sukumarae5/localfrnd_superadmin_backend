-- CreateEnum
CREATE TYPE "wallet_txn_type" AS ENUM ('credit', 'debit', 'refund', 'bonus', 'recharge');

-- CreateEnum
CREATE TYPE "wallet_txn_status" AS ENUM ('pending', 'completed', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('upi', 'credit_card', 'wallet', 'other');

-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('bug', 'feature', 'complaint', 'general');

-- CreateEnum
CREATE TYPE "feedback_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "feedback_priority" AS ENUM ('low', 'medium', 'high');

-- AlterTable
ALTER TABLE "user_activity_log" ADD COLUMN     "device_info" VARCHAR(150),
ADD COLUMN     "location" VARCHAR(150),
ADD COLUMN     "risk_level" "risk_level" NOT NULL DEFAULT 'low';

-- AlterTable
ALTER TABLE "user_wallets" ADD COLUMN     "frozen_at" TIMESTAMP(3),
ADD COLUMN     "frozen_by" BIGINT,
ADD COLUMN     "is_frozen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "device_info" VARCHAR(150),
    "platform" VARCHAR(30),
    "os" VARCHAR(50),
    "ip_address" INET,
    "location" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "wallet_txn_type" NOT NULL,
    "status" "wallet_txn_status" NOT NULL DEFAULT 'completed',
    "amount" DECIMAL(14,2) NOT NULL,
    "coins" BIGINT NOT NULL DEFAULT 0,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "payment_method" "payment_method",
    "description" TEXT,
    "reference_id" VARCHAR(100),
    "initiated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "id" BIGSERIAL NOT NULL,
    "ticket_code" VARCHAR(20) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "feedback_type" NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "category" VARCHAR(50),
    "rating" SMALLINT,
    "priority" "feedback_priority" NOT NULL DEFAULT 'low',
    "status" "feedback_status" NOT NULL DEFAULT 'open',
    "assigned_to" BIGINT,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_is_active_last_seen_at_idx" ON "user_sessions"("is_active", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_public_id_key" ON "wallet_transactions"("public_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_feedback_ticket_code_key" ON "user_feedback"("ticket_code");

-- CreateIndex
CREATE INDEX "user_feedback_status_idx" ON "user_feedback"("status");

-- CreateIndex
CREATE INDEX "user_feedback_type_idx" ON "user_feedback"("type");

-- CreateIndex
CREATE INDEX "user_feedback_priority_idx" ON "user_feedback"("priority");

-- CreateIndex
CREATE INDEX "user_feedback_created_at_idx" ON "user_feedback"("created_at");

-- CreateIndex
CREATE INDEX "user_activity_log_risk_level_idx" ON "user_activity_log"("risk_level");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_frozen_by_fkey" FOREIGN KEY ("frozen_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
