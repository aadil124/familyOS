# Backend Module Roadmap

This document outlines the detailed roadmap for the remaining backend modules, defining endpoints, dependencies, and testing strategies.

---

## 1. Module Specifications

### 1.1 Documents Module
- **Purpose**: Manage physical document uploads, retrieval, and library metadata.
- **Dependencies**: `FamilyModule`, `PrismaModule`.
- **Inputs**: File upload streams (Multipart), search queries, metadata patch objects.
- **Outputs**: Signed upload parameters, timed retrieval URLs, document details.
- **Public APIs**:
  - `POST /api/v1/families/:familyId/documents/upload-signature` (Get signed upload config)
  - `POST /api/v1/families/:familyId/documents` (Register uploaded file)
  - `GET /api/v1/families/:familyId/documents` (List active documents)
  - `GET /api/v1/families/:familyId/documents/:documentId/download` (Get signed download link)
  - `PATCH /api/v1/families/:familyId/documents/:documentId/metadata` (Update details)
  - `DELETE /api/v1/families/:familyId/documents/:documentId` (Soft delete document)
- **External Integrations**: Cloudinary SDK (SDK signed upload, admin asset delete).
- **Testing Strategy**: Mock Cloudinary API responses. Write E2E integration tests to verify signed URL generation and file metadata registration.

### 1.2 OCR Module
- **Purpose**: Extract text from document images/PDFs.
- **Dependencies**: `DocumentsModule`, `PrismaModule`.
- **Inputs**: Document image URL reference.
- **Outputs**: Extracted plain text string, OCR status.
- **Public APIs**:
  - `GET /api/v1/families/:familyId/documents/:documentId/ocr` (Get OCR plain text result)
- **Internal Services**: `OcrService`.
- **External Integrations**: Third-party OCR API (e.g. Google Cloud Vision or Tesseract provider).
- **Testing Strategy**: Mock OCR HTTP responses with mock image text. Unit test the extraction pipeline.

### 1.3 AI Module
- **Purpose**: Parse raw OCR text into structured JSON metadata.
- **Dependencies**: `OCRModule`, `PrismaModule`.
- **Inputs**: Raw OCR text string, document classifier guidelines.
- **Outputs**: Structured JSON payload, confidence level.
- **Public APIs**:
  - `GET /api/v1/families/:familyId/documents/:documentId/analysis` (Get AI analysis results)
- **Internal Services**: `AiExtractionService`.
- **External Integrations**: OpenAI API (gpt-4o / structured outputs).
- **Testing Strategy**: Use static mock OCR inputs and verify the JSON parser's schema validation behavior.

### 1.4 Readiness Module
- **Purpose**: Evaluate documents against life event rules to compute scores.
- **Dependencies**: `AIModule`, `PrismaModule`.
- **Inputs**: Selected Life Event ID, family document metadata.
- **Outputs**: Readiness score, completeness checklist, list of gaps.
- **Public APIs**:
  - `GET /api/v1/life-events` (List available life event rules)
  - `POST /api/v1/families/:familyId/readiness-assessments` (Run readiness assessment)
  - `GET /api/v1/families/:familyId/readiness-assessments/:id` (Get details)
- **Internal Services**: `ReadinessEvaluationService`.
- **Testing Strategy**: Unit test the scoring algorithm against various combinations of missing and mismatched documents.

### 1.5 AI Assistant (Chat) Module
- **Purpose**: Provide conversational context-aware document assistant.
- **Dependencies**: `ReadinessModule`, `PrismaModule`.
- **Inputs**: User message, conversation ID context.
- **Outputs**: Assistant message stream, follow-up recommendations.
- **Public APIs**:
  - `GET /api/v1/families/:familyId/conversations` (List chat threads)
  - `POST /api/v1/families/:familyId/conversations` (Create thread)
  - `POST /api/v1/families/:familyId/conversations/:convoId/messages` (Send user question)
- **Internal Services**: `ChatSessionService`, `ContextBuilderService`.
- **External Integrations**: OpenAI Chat Completions API.
- **Testing Strategy**: Mock OpenAI chat completion responses. Verify session persistence and prompt construction.

### 1.6 Notifications Module
- **Purpose**: Scan document dates and status changes to trigger alerts.
- **Dependencies**: `ReadinessModule`, `PrismaModule`.
- **Inputs**: Event emitters, database cron schedules.
- **Outputs**: Dispatch of read/unread notification objects.
- **Public APIs**:
  - `GET /api/v1/families/:familyId/notifications` (List notifications)
  - `PATCH /api/v1/families/:familyId/notifications/:id/read` (Mark read)
- **Internal Services**: `ExpirationScanService`, `NotificationDispatcherService`.
- **Testing Strategy**: Trigger mock expiration events and assert that notification records are generated in the database.

---

## 2. Implementation Order

Modules must be developed in the following order to ensure proper data flow:
1. **Documents Module** (Upload foundation)
2. **OCR Module** (Text extraction)
3. **AI Module** (Fact extraction)
4. **Readiness Module** (Logic engine)
5. **AI Assistant Module** (Chat interface)
6. **Notifications Module** (Alert systems)
