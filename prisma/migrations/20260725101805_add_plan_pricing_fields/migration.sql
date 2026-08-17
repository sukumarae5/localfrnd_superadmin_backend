/*
  Warnings:

  - Added the required column `original_price` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_after_discount` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discount_percent" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "original_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "price_after_discount" DECIMAL(10,2) NOT NULL;
