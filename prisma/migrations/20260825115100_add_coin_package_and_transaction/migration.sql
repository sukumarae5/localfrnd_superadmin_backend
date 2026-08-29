-- CreateEnum
CREATE TYPE "coin_package_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "coin_transaction_type" AS ENUM ('purchase', 'admin_credit', 'admin_debit', 'refund', 'usage');

-- CreateEnum
CREATE TYPE "coin_transaction_status" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "coin_packages" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "coins" INTEGER NOT NULL,
    "bonus_coins" INTEGER NOT NULL DEFAULT 0,
    "total_coins" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "coin_package_status" NOT NULL DEFAULT 'active',
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "coin_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "coin_package_id" INTEGER,
    "type" "coin_transaction_type" NOT NULL,
    "status" "coin_transaction_status" NOT NULL DEFAULT 'pending',
    "coins" INTEGER NOT NULL,
    "bonus_coins" INTEGER NOT NULL DEFAULT 0,
    "total_coins" INTEGER NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" VARCHAR(3),
    "payment_provider" TEXT,
    "payment_id" TEXT,
    "payment_order_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_packages_public_id_key" ON "coin_packages"("public_id");

-- CreateIndex
CREATE INDEX "coin_packages_status_idx" ON "coin_packages"("status");

-- CreateIndex
CREATE INDEX "coin_packages_sort_order_idx" ON "coin_packages"("sort_order");

-- CreateIndex
CREATE INDEX "coin_packages_deleted_at_idx" ON "coin_packages"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "coin_transactions_public_id_key" ON "coin_transactions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "coin_transactions_payment_id_key" ON "coin_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "coin_transactions_user_id_idx" ON "coin_transactions"("user_id");

-- CreateIndex
CREATE INDEX "coin_transactions_coin_package_id_idx" ON "coin_transactions"("coin_package_id");

-- CreateIndex
CREATE INDEX "coin_transactions_status_idx" ON "coin_transactions"("status");

-- CreateIndex
CREATE INDEX "coin_transactions_type_idx" ON "coin_transactions"("type");

-- CreateIndex
CREATE INDEX "coin_transactions_created_at_idx" ON "coin_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_coin_package_id_fkey" FOREIGN KEY ("coin_package_id") REFERENCES "coin_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
