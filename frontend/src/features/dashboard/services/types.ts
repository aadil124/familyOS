export type DocumentProcessingStatus = "PENDING" | "OCR_PROCESSING" | "AI_PROCESSING" | "SUCCESS" | "FAILED";

export interface FamilyResponseDto {
  id: string;
  ownerUserId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMemberResponseDto {
  id: string;
  familyId: string;
  fullName: string;
  relationship: string | null;
  dateOfBirth: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCategoryResponseDto {
  id: string;
  name: string;
  description?: string | null;
  normalizedKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentResponseDto {
  id: string;
  familyId: string;
  familyMemberId?: string | null;
  categoryId?: string | null;
  category?: DocumentCategoryResponseDto | null;
  originalFileName: string;
  displayName: string;
  fileType: string;
  fileSize?: number | null;
  storageProvider: string;
  storageAssetId: string;
  storageUrlReference?: string | null;
  uploadStatus: string;
  processingStatus: DocumentProcessingStatus;
  reviewStatus: string;
  issueStatus?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LifeEventResponseDto {
  id: string;
  name: string;
  normalizedKey: string;
  description?: string | null;
  category?: string | null;
  expectedDocumentRules?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessAssessmentResponseDto {
  id: string;
  familyId: string;
  familyMemberId?: string | null;
  lifeEventId: string;
  requestedByUserId: string;
  status: string;
  readinessScore?: number | null;
  readinessLevel?: string | null;
  availableDocuments?: unknown;
  missingDocuments?: unknown;
  mismatchWarnings?: unknown;
  expiryWarnings?: unknown;
  nextSteps?: string | null;
  processSummary?: string | null;
  confidenceScore?: number | null;
  failureReason?: string | null;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
  lifeEvent?: LifeEventResponseDto | null;
}

export interface NotificationResponseDto {
  id: string;
  userId: string;
  familyId: string;
  relatedDocumentId?: string | null;
  relatedFamilyMemberId?: string | null;
  relatedAssessmentId?: string | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  actionLabel?: string | null;
  actionReference?: string | null;
  createdAt: string;
  updatedAt: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  expiresAt?: string | null;
}

export interface HealthResponseDto {
  status: string;
  database: string;
  service: string;
  version: string;
}
