-- CreateEnum
CREATE TYPE "cms_page_key" AS ENUM ('about_us', 'privacy_policy', 'terms_conditions', 'contact_us');

-- CreateEnum
CREATE TYPE "cms_page_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "faq_category_status" AS ENUM ('active', 'inactive', 'draft', 'hidden');

-- CreateEnum
CREATE TYPE "faq_status" AS ENUM ('published', 'draft', 'hidden');

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "page_key" "cms_page_key" NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "status" "cms_page_status" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_page_revisions" (
    "id" BIGSERIAL NOT NULL,
    "page_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" JSONB NOT NULL,
    "status" "cms_page_status" NOT NULL,
    "change_note" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_page_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_categories" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "faq_category_status" NOT NULL DEFAULT 'draft',
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "category_id" BIGINT NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "answer" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "faq_status" NOT NULL DEFAULT 'draft',
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_public_id_key" ON "cms_pages"("public_id");

-- CreateIndex
CREATE INDEX "cms_pages_status_idx" ON "cms_pages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_page_key_language_key" ON "cms_pages"("page_key", "language");

-- CreateIndex
CREATE INDEX "cms_page_revisions_page_id_version_idx" ON "cms_page_revisions"("page_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "faq_categories_public_id_key" ON "faq_categories"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "faq_categories_display_code_key" ON "faq_categories"("display_code");

-- CreateIndex
CREATE UNIQUE INDEX "faq_categories_slug_key" ON "faq_categories"("slug");

-- CreateIndex
CREATE INDEX "faq_categories_status_idx" ON "faq_categories"("status");

-- CreateIndex
CREATE INDEX "faq_categories_sort_order_idx" ON "faq_categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "faqs_public_id_key" ON "faqs"("public_id");

-- CreateIndex
CREATE INDEX "faqs_category_id_idx" ON "faqs"("category_id");

-- CreateIndex
CREATE INDEX "faqs_status_idx" ON "faqs"("status");

-- AddForeignKey
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "cms_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_categories" ADD CONSTRAINT "faq_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_categories" ADD CONSTRAINT "faq_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
