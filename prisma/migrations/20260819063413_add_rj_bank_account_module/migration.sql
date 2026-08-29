-- CreateEnum
CREATE TYPE "bank_account_status" AS ENUM ('pending', 'verified', 'rejected', 'under_review');

-- CreateEnum
CREATE TYPE "penny_drop_status" AS ENUM ('pending', 'verified', 'failed', 'retry');

-- CreateTable
CREATE TABLE "rj_bank_accounts" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "bank_name" VARCHAR(100),
    "account_type" VARCHAR(20),
    "account_number" VARCHAR(30) NOT NULL,
    "ifsc_code" VARCHAR(15),
    "upi_id" VARCHAR(150),
    "account_holder_name" VARCHAR(100),
    "status" "bank_account_status" NOT NULL DEFAULT 'pending',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "pan_match_score" SMALLINT,
    "penny_drop_status" "penny_drop_status" NOT NULL DEFAULT 'pending',
    "is_duplicate_flagged" BOOLEAN NOT NULL DEFAULT false,
    "duplicate_risk_level" "risk_level",
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "verified_by" BIGINT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rj_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_bank_account_verification_logs" (
    "id" BIGSERIAL NOT NULL,
    "bank_account_id" BIGINT NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "note" TEXT,
    "performed_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_bank_account_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rj_bank_accounts_public_id_key" ON "rj_bank_accounts"("public_id");

-- CreateIndex
CREATE INDEX "rj_bank_accounts_rj_id_idx" ON "rj_bank_accounts"("rj_id");

-- CreateIndex
CREATE INDEX "rj_bank_accounts_status_idx" ON "rj_bank_accounts"("status");

-- CreateIndex
CREATE INDEX "rj_bank_accounts_account_number_idx" ON "rj_bank_accounts"("account_number");

-- CreateIndex
CREATE INDEX "rj_bank_accounts_is_duplicate_flagged_idx" ON "rj_bank_accounts"("is_duplicate_flagged");

-- CreateIndex
CREATE INDEX "rj_bank_account_verification_logs_bank_account_id_idx" ON "rj_bank_account_verification_logs"("bank_account_id");

-- AddForeignKey
ALTER TABLE "rj_bank_accounts" ADD CONSTRAINT "rj_bank_accounts_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_bank_accounts" ADD CONSTRAINT "rj_bank_accounts_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_bank_account_verification_logs" ADD CONSTRAINT "rj_bank_account_verification_logs_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "rj_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_bank_account_verification_logs" ADD CONSTRAINT "rj_bank_account_verification_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
