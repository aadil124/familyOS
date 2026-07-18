/*
  Warnings:

  - The `reviewStatus` column on the `documents` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('UNREVIEWED', 'PENDING_REVIEW', 'REVIEWED', 'USER_VERIFIED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "reviewStatus",
ADD COLUMN     "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'UNREVIEWED';

-- CreateTable
CREATE TABLE "document_analyses" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "detectedDocumentType" TEXT,
    "extractedFields" JSONB,
    "nameOnDocument" TEXT,
    "addressOnDocument" TEXT,
    "issuedDate" TEXT,
    "expiryDate" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "mismatchFlags" JSONB,
    "analysisSummary" TEXT,
    "failureReason" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_analyses_documentId_key" ON "document_analyses"("documentId");

-- AddForeignKey
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
