-- CreateEnum
CREATE TYPE "call_type" AS ENUM ('audio', 'video');

-- AlterTable
ALTER TABLE "rj_call_sessions" ADD COLUMN     "call_type" "call_type",
ADD COLUMN     "coin_rate_per_minute" INTEGER,
ADD COLUMN     "end_reason" VARCHAR(40),
ADD COLUMN     "rj_earn_rate_per_minute" INTEGER;
