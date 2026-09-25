-- CreateEnum
CREATE TYPE "rj_ring_txn_type" AS ENUM ('call_earning', 'conversion', 'admin_adjustment');

-- AlterEnum
ALTER TYPE "rj_wallet_txn_type" ADD VALUE 'ring_conversion';

-- AlterTable
ALTER TABLE "rj_wallets" ADD COLUMN     "rings_balance" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rj_ring_transactions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "type" "rj_ring_txn_type" NOT NULL,
    "rings" BIGINT NOT NULL,
    "rings_balance_after" BIGINT NOT NULL,
    "call_session_id" BIGINT,
    "conversion_id" BIGINT,
    "description" TEXT,
    "initiated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_ring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_ring_conversions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "rj_id" BIGINT NOT NULL,
    "rings_converted" BIGINT NOT NULL,
    "conversion_rate_applied" DECIMAL(10,4) NOT NULL,
    "amount_credited" DECIMAL(14,2) NOT NULL,
    "rings_balance_after" BIGINT NOT NULL,
    "wallet_balance_after" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_ring_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_ring_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "conversion_rate" DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    "min_convertible_rings" BIGINT NOT NULL DEFAULT 500,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_ring_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rj_ring_transactions_public_id_key" ON "rj_ring_transactions"("public_id");

-- CreateIndex
CREATE INDEX "rj_ring_transactions_rj_id_created_at_idx" ON "rj_ring_transactions"("rj_id", "created_at");

-- CreateIndex
CREATE INDEX "rj_ring_transactions_type_idx" ON "rj_ring_transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "rj_ring_conversions_public_id_key" ON "rj_ring_conversions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "rj_ring_conversions_display_code_key" ON "rj_ring_conversions"("display_code");

-- CreateIndex
CREATE INDEX "rj_ring_conversions_rj_id_created_at_idx" ON "rj_ring_conversions"("rj_id", "created_at");

-- AddForeignKey
ALTER TABLE "rj_ring_transactions" ADD CONSTRAINT "rj_ring_transactions_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_ring_transactions" ADD CONSTRAINT "rj_ring_transactions_conversion_id_fkey" FOREIGN KEY ("conversion_id") REFERENCES "rj_ring_conversions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_ring_transactions" ADD CONSTRAINT "rj_ring_transactions_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_ring_conversions" ADD CONSTRAINT "rj_ring_conversions_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_ring_settings" ADD CONSTRAINT "rj_ring_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
