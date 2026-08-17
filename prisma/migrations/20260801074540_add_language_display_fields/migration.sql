-- CreateEnum
CREATE TYPE "avatar_gender" AS ENUM ('male', 'female', 'unisex');

-- CreateEnum
CREATE TYPE "LanguageType" AS ENUM ('NATIONAL', 'REGIONAL');

-- AlterTable
ALTER TABLE "languages" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "native_name" VARCHAR(50),
ADD COLUMN     "supports_in_app_chat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supports_onboarding" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supports_video_calls" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supports_voice_calls" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "LanguageType" NOT NULL DEFAULT 'NATIONAL',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_cloudinary_id" TEXT,
ADD COLUMN     "avatar_id" INTEGER,
ADD COLUMN     "is_custom_avatar" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "avatars" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "gender" "avatar_gender" NOT NULL,
    "image_url" TEXT NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "avatars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avatars_public_id_key" ON "avatars"("public_id");

-- CreateIndex
CREATE INDEX "avatars_gender_is_active_idx" ON "avatars"("gender", "is_active");

-- CreateIndex
CREATE INDEX "avatars_sort_order_idx" ON "avatars"("sort_order");

-- AddForeignKey
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "avatars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
