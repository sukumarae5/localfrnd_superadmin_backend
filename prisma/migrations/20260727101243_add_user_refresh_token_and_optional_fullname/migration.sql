-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "refresh_token_hash" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "full_name" DROP NOT NULL;
