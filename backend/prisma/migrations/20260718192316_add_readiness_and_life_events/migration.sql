-- CreateTable
CREATE TABLE "life_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "expectedDocumentRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_assessments" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "lifeEventId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "readinessScore" DOUBLE PRECISION,
    "readinessLevel" TEXT,
    "availableDocuments" JSONB,
    "missingDocuments" JSONB,
    "mismatchWarnings" JSONB,
    "expiryWarnings" JSONB,
    "nextSteps" TEXT,
    "processSummary" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "failureReason" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "readiness_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "life_events_normalizedKey_key" ON "life_events"("normalizedKey");

-- CreateIndex
CREATE INDEX "readiness_assessments_familyId_idx" ON "readiness_assessments"("familyId");

-- CreateIndex
CREATE INDEX "readiness_assessments_familyMemberId_idx" ON "readiness_assessments"("familyMemberId");

-- CreateIndex
CREATE INDEX "readiness_assessments_lifeEventId_idx" ON "readiness_assessments"("lifeEventId");

-- AddForeignKey
ALTER TABLE "readiness_assessments" ADD CONSTRAINT "readiness_assessments_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_assessments" ADD CONSTRAINT "readiness_assessments_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_assessments" ADD CONSTRAINT "readiness_assessments_lifeEventId_fkey" FOREIGN KEY ("lifeEventId") REFERENCES "life_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_assessments" ADD CONSTRAINT "readiness_assessments_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
