-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locality" VARCHAR(150),
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" BIGINT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
