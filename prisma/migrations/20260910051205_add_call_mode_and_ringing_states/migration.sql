-- CreateEnum
CREATE TYPE "call_mode" AS ENUM ('random', 'direct', 'local');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "call_status" ADD VALUE 'ringing';
ALTER TYPE "call_status" ADD VALUE 'rejected';
ALTER TYPE "call_status" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "rj_call_sessions" ADD COLUMN     "call_mode" "call_mode";
