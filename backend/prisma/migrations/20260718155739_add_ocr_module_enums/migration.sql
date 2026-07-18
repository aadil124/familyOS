/*
  Warnings:

  - The `processingStatus` column on the `documents` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'OCR_PROCESSING', 'AI_PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "OCRStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "processingStatus",
ADD COLUMN     "processingStatus" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ocr_results" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "status" "OCRStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "textReference" TEXT,
    "languageHints" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ocr_results_documentId_key" ON "ocr_results"("documentId");

-- AddForeignKey
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
