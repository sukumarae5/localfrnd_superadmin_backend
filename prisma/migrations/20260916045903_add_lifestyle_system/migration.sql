-- CreateEnum
CREATE TYPE "lifestyle_category_status" AS ENUM ('active', 'inactive', 'draft', 'hidden');

-- CreateEnum
CREATE TYPE "lifestyle_status" AS ENUM ('active', 'inactive', 'draft', 'hidden');

-- CreateEnum
CREATE TYPE "lifestyle_selection_type" AS ENUM ('single', 'multiple');

-- CreateTable
CREATE TABLE "lifestyle_categories" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255),
    "selection_type" "lifestyle_selection_type" NOT NULL DEFAULT 'single',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "lifestyle_category_status" NOT NULL DEFAULT 'draft',
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lifestyle_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifestyles" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "category_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "lifestyle_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lifestyles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lifestyles" (
    "user_id" BIGINT NOT NULL,
    "lifestyle_id" BIGINT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lifestyles_pkey" PRIMARY KEY ("user_id","lifestyle_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lifestyle_categories_public_id_key" ON "lifestyle_categories"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "lifestyle_categories_display_code_key" ON "lifestyle_categories"("display_code");

-- CreateIndex
CREATE UNIQUE INDEX "lifestyle_categories_slug_key" ON "lifestyle_categories"("slug");

-- CreateIndex
CREATE INDEX "lifestyle_categories_status_idx" ON "lifestyle_categories"("status");

-- CreateIndex
CREATE INDEX "lifestyle_categories_sort_order_idx" ON "lifestyle_categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "lifestyles_public_id_key" ON "lifestyles"("public_id");

-- CreateIndex
CREATE INDEX "lifestyles_category_id_idx" ON "lifestyles"("category_id");

-- CreateIndex
CREATE INDEX "lifestyles_status_idx" ON "lifestyles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lifestyles_category_id_slug_key" ON "lifestyles"("category_id", "slug");

-- CreateIndex
CREATE INDEX "user_lifestyles_lifestyle_id_idx" ON "user_lifestyles"("lifestyle_id");

-- AddForeignKey
ALTER TABLE "lifestyle_categories" ADD CONSTRAINT "lifestyle_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifestyle_categories" ADD CONSTRAINT "lifestyle_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifestyles" ADD CONSTRAINT "lifestyles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lifestyle_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lifestyles" ADD CONSTRAINT "user_lifestyles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lifestyles" ADD CONSTRAINT "user_lifestyles_lifestyle_id_fkey" FOREIGN KEY ("lifestyle_id") REFERENCES "lifestyles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
