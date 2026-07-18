-- AlterTable
ALTER TABLE "documents" RENAME COLUMN "documentTypeId" TO "categoryId";

-- RenameTable
ALTER TABLE "document_types" RENAME TO "document_categories";

-- Rename ForeignKey
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_documentTypeId_fkey";
ALTER TABLE "documents" ADD CONSTRAINT "documents_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "documents_familyId_idx" ON "documents"("familyId");
CREATE INDEX "documents_categoryId_idx" ON "documents"("categoryId");
CREATE INDEX "documents_familyMemberId_idx" ON "documents"("familyMemberId");
