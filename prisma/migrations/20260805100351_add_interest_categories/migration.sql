-- CreateEnum
CREATE TYPE "interest_status" AS ENUM ('active', 'hidden', 'draft', 'inactive');

-- CreateEnum
CREATE TYPE "interest_visibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "popularity_level" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "interest_categories" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL DEFAULT 'General',
    "status" "interest_status" NOT NULL DEFAULT 'draft',
    "visibility" "interest_visibility" NOT NULL DEFAULT 'public',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_trending" BOOLEAN NOT NULL DEFAULT false,
    "recommendation_score" SMALLINT NOT NULL DEFAULT 0,
    "popularity" "popularity_level" NOT NULL DEFAULT 'low',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "interest_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_category_languages" (
    "interest_category_id" BIGINT NOT NULL,
    "language_id" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_category_languages_pkey" PRIMARY KEY ("interest_category_id","language_id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "user_id" BIGINT NOT NULL,
    "interest_category_id" BIGINT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("user_id","interest_category_id")
);

-- CreateTable
CREATE TABLE "rj_interests" (
    "rj_id" BIGINT NOT NULL,
    "interest_category_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" BIGINT,

    CONSTRAINT "rj_interests_pkey" PRIMARY KEY ("rj_id","interest_category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interest_categories_public_id_key" ON "interest_categories"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "interest_categories_display_code_key" ON "interest_categories"("display_code");

-- CreateIndex
CREATE UNIQUE INDEX "interest_categories_slug_key" ON "interest_categories"("slug");

-- CreateIndex
CREATE INDEX "interest_categories_status_idx" ON "interest_categories"("status");

-- CreateIndex
CREATE INDEX "interest_categories_visibility_idx" ON "interest_categories"("visibility");

-- CreateIndex
CREATE INDEX "interest_categories_is_featured_idx" ON "interest_categories"("is_featured");

-- CreateIndex
CREATE INDEX "interest_categories_is_trending_idx" ON "interest_categories"("is_trending");

-- CreateIndex
CREATE INDEX "user_interests_interest_category_id_idx" ON "user_interests"("interest_category_id");

-- CreateIndex
CREATE INDEX "rj_interests_interest_category_id_idx" ON "rj_interests"("interest_category_id");

-- AddForeignKey
ALTER TABLE "interest_categories" ADD CONSTRAINT "interest_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_categories" ADD CONSTRAINT "interest_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_category_languages" ADD CONSTRAINT "interest_category_languages_interest_category_id_fkey" FOREIGN KEY ("interest_category_id") REFERENCES "interest_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_category_languages" ADD CONSTRAINT "interest_category_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interest_category_id_fkey" FOREIGN KEY ("interest_category_id") REFERENCES "interest_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_interests" ADD CONSTRAINT "rj_interests_rj_id_fkey" FOREIGN KEY ("rj_id") REFERENCES "rjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_interests" ADD CONSTRAINT "rj_interests_interest_category_id_fkey" FOREIGN KEY ("interest_category_id") REFERENCES "interest_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_interests" ADD CONSTRAINT "rj_interests_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
