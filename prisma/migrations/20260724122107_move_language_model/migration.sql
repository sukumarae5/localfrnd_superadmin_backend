-- CreateEnum
CREATE TYPE "kyc_doc_type" AS ENUM ('aadhaar', 'passport', 'driving_license', 'voter_id');

-- CreateEnum
CREATE TYPE "kyc_request_status" AS ENUM ('pending_review', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" BIGSERIAL NOT NULL,
    "request_code" VARCHAR(30) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "doc_type" "kyc_doc_type" NOT NULL,
    "doc_number" VARCHAR(50) NOT NULL,
    "doc_expiry" TIMESTAMP(3),
    "nationality" VARCHAR(50),
    "selfie_url" TEXT NOT NULL,
    "selfie_quality" VARCHAR(20),
    "id_front_url" TEXT NOT NULL,
    "id_front_readable" BOOLEAN NOT NULL DEFAULT false,
    "id_back_url" TEXT,
    "id_back_sharp" BOOLEAN NOT NULL DEFAULT false,
    "face_match_score" INTEGER,
    "ocr_name" TEXT,
    "ocr_address" TEXT,
    "name_matched" BOOLEAN,
    "address_matched" BOOLEAN,
    "id_authenticity" BOOLEAN,
    "face_liveness" BOOLEAN,
    "sanction_list_ok" BOOLEAN,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" "risk_level" NOT NULL DEFAULT 'low',
    "status" "kyc_request_status" NOT NULL DEFAULT 'pending_review',
    "rejection_reason" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kyc_verifications_request_code_key" ON "kyc_verifications"("request_code");

-- CreateIndex
CREATE INDEX "kyc_verifications_status_idx" ON "kyc_verifications"("status");

-- CreateIndex
CREATE INDEX "kyc_verifications_submitted_at_idx" ON "kyc_verifications"("submitted_at");

-- CreateIndex
CREATE INDEX "kyc_verifications_user_id_idx" ON "kyc_verifications"("user_id");

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
