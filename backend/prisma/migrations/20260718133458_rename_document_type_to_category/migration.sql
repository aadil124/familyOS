-- AlterTable
ALTER TABLE "document_categories" RENAME CONSTRAINT "document_types_pkey" TO "document_categories_pkey";

-- RenameIndex
ALTER INDEX "document_types_normalizedKey_key" RENAME TO "document_categories_normalizedKey_key";
