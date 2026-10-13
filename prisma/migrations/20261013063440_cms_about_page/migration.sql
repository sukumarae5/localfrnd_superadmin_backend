-- AlterEnum
ALTER TYPE "payment_method" ADD VALUE 'bank_transfer';

-- AlterTable
ALTER TABLE "cms_pages" ADD COLUMN     "seo" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "visibility" JSONB NOT NULL DEFAULT '{}';
