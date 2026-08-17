-- CreateEnum
CREATE TYPE "block_type" AS ENUM ('temporary', 'permanent');

-- CreateEnum
CREATE TYPE "blocked_by_type" AS ENUM ('admin', 'system');

-- CreateEnum
CREATE TYPE "appeal_status" AS ENUM ('pending', 'accepted', 'rejected');

-- AlterTable
ALTER TABLE "user_status_history" ADD COLUMN     "block_type" "block_type",
ADD COLUMN     "blocked_by_type" "blocked_by_type" DEFAULT 'admin',
ADD COLUMN     "expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_appeals" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status_history_id" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "appeal_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_appeals_user_id_idx" ON "user_appeals"("user_id");

-- CreateIndex
CREATE INDEX "user_appeals_status_idx" ON "user_appeals"("status");

-- CreateIndex
CREATE INDEX "user_appeals_status_history_id_idx" ON "user_appeals"("status_history_id");

-- CreateIndex
CREATE INDEX "user_status_history_new_status_block_type_idx" ON "user_status_history"("new_status", "block_type");

-- AddForeignKey
ALTER TABLE "user_appeals" ADD CONSTRAINT "user_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_appeals" ADD CONSTRAINT "user_appeals_status_history_id_fkey" FOREIGN KEY ("status_history_id") REFERENCES "user_status_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_appeals" ADD CONSTRAINT "user_appeals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
