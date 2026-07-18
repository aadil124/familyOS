# FamilyOS Backend: API Endpoints Directory

This report documents every active API endpoint registered across all NestJS modules in the FamilyOS backend.

## Global Configurations
*   **Base Prefix**: `/api` (configured globally via `app.setGlobalPrefix('api')` in `main.ts`).
*   **API Versioning**: Enforced via path prefix `/v1/`.
*   **Security & Guards**:
    *   All endpoints require authentication via the `JwtAuthGuard` and `Authorization: Bearer <JWT>` header unless marked as **Public**.
    *   Workspace endpoints prefixed with `/api/v1/families/:familyId/` require that the authenticated user owns the specified family workspace.

---

## 1. Health Module
Checks application container health and database connectivity.
*   **Base Controller Path**: `/health`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **GET** | `/health` | **Public** | None | `{ success: true, data: { status: "ok", timestamp } }` | Health check endpoint for system monitoring. Returns `500` if DB is unreachable. |

---

## 2. Authentication Module
Handles user registration, session logins, token refreshes, and profiles.
*   **Base Controller Path**: `/api/v1/auth`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **POST** | `/register` | **Public** | `CreateUserDto` (email, password, fullName) | JWT tokens + User details | Creates a new user profile. |
| **POST** | `/login` | **Public** | `LoginDto` (email, password) | JWT tokens + User details | Validates credentials and issues Access + Refresh tokens. |
| **POST** | `/refresh` | **Public** | `RefreshTokenDto` (refreshToken) | New JWT tokens | Exchanges a valid refresh token for a new access token. |
| **POST** | `/logout` | **Public** | `RefreshTokenDto` (refreshToken) | `{ success: true }` | Blacklists/invalidates the provided refresh token. |
| **GET** | `/me` | `JwtAuthGuard` | None | `{ success: true, data: User }` | Fetches profile of the currently logged-in user. |

---

## 3. Family Module (Workspaces)
Manages isolated family workspaces.
*   **Base Controller Path**: `/api/v1/families`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **POST** | `/` | `JwtAuthGuard` | `CreateFamilyDto` (name) | `{ success: true, data: Family }` | Creates a new family workspace owned by the current user. |
| **GET** | `/` | `JwtAuthGuard` | None | `{ success: true, data: Family[] }` | Lists all workspaces owned by the user. |
| **GET** | `/:id` | `JwtAuthGuard` | Path ID | `{ success: true, data: Family }` | Fetches details of a specific workspace. |
| **PATCH** | `/:id` | `JwtAuthGuard` | `UpdateFamilyDto` (name) | `{ success: true, data: Family }` | Modifies the workspace configuration. |
| **DELETE** | `/:id` | `JwtAuthGuard` | Path ID | `{ success: true, data: Family }` | Soft-deletes a family workspace (sets `deletedAt`). |

---

## 4. Family Member Module
Manages family member profiles within a workspace.
*   **Base Controller Path**: `/api/v1/families/:familyId/members`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **POST** | `/` | `JwtAuthGuard` | `CreateFamilyMemberDto` | `{ success: true, data: FamilyMember }` | Adds a member profile (fullName, relationship, dateOfBirth). |
| **GET** | `/` | `JwtAuthGuard` | None | `{ success: true, data: FamilyMember[] }` | Lists active members of the workspace. |
| **GET** | `/:memberId` | `JwtAuthGuard` | Path IDs | `{ success: true, data: FamilyMember }` | Fetches details of a specific family member. |
| **PATCH** | `/:memberId` | `JwtAuthGuard` | `UpdateFamilyMemberDto` | `{ success: true, data: FamilyMember }` | Updates member details. |
| **DELETE** | `/:memberId` | `JwtAuthGuard` | Path IDs | `{ success: true, data: FamilyMember }` | Soft-deletes the family member profile. |

---

## 5. Documents Module
Handles category definitions, Cloudinary secure uploads, metadata registrations, and downloads.
*   **Base Controller Path**: `/api/v1/families/:familyId/documents`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **POST** | `/upload-signature` | `JwtAuthGuard` | None | Cloudinary credentials + signature | Generates signed upload tokens for direct frontend-to-cloud upload. |
| **POST** | `/` | `JwtAuthGuard` | `CreateDocumentDto` | `{ success: true, data: Document }` | Registers uploaded file metadata in the database. |
| **GET** | `/categories` | **Public** | None | `{ success: true, data: Category[] }` | Lists all supported document categories. |
| **GET** | `/` | `JwtAuthGuard` | Pagination + category/status filters | Paginated `Document[]` list | Lists active documents in the workspace. |
| **GET** | `/:documentId` | `JwtAuthGuard` | Path IDs | `{ success: true, data: Document }` | Retrieves a specific document's metadata. |
| **PATCH** | `/:documentId/metadata` | `JwtAuthGuard` | `UpdateDocumentMetadataDto` | `{ success: true, data: Document }` | Updates document labels, category, or member link. |
| **GET** | `/:documentId/download` | `JwtAuthGuard` | Path IDs | `{ success: true, data: { downloadUrl } }` | Generates a 15-minute secure signed Cloudinary download URL. |
| **DELETE** | `/:documentId` | `JwtAuthGuard` | Path IDs | `{ success: true, data: Document }` | Soft-deletes the document metadata record. |

---

## 6. OCR Module
Tracks raw text extractions from uploaded files.
*   **Base Controller Path**: `/api/v1/families/:familyId/documents`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **GET** | `/:documentId/ocr` | `JwtAuthGuard` | Path IDs | `{ success: true, data: OCRResult }` | Retrieves raw text and confidence scores extracted by OCR. |

---

## 7. AI Analysis & Chat Module
Handles metadata analysis results and AI completions threads.
*   **Base Controller Paths**: 
    *   `/api/v1/families/:familyId/documents`
    *   `/api/v1/families/:familyId/chat/conversations`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **GET** | `/:documentId/analysis` | `JwtAuthGuard` | Path IDs | `{ success: true, data: DocumentAnalysis }` | Fetches extracted metadata, issue/expiry dates, and name/address mismatch flags. |
| **POST** | `/` | `JwtAuthGuard` | `CreateConversationDto` (title optional) | `{ success: true, data: AIConversation }` | Creates a new AI assistant conversation thread. |
| **GET** | `/` | `JwtAuthGuard` | Pagination query | Paginated `AIConversation[]` | Lists active chat threads in the family workspace. |
| **POST** | `/:conversationId/messages` | `JwtAuthGuard` | `SendMessageDto` (content) | `{ success: true, data: AIMessage }` | Sends query, builds grounding context, and returns AI response. |
| **GET** | `/:conversationId/messages` | `JwtAuthGuard` | Pagination query | Paginated `AIMessage[]` history | Fetches message history for a conversation thread. |

---

## 8. Readiness Assessment Module
Maintains checklist models and calculates readiness gaps for life events.
*   **Base Controller Paths**:
    *   `/api/v1/life-events`
    *   `/api/v1/families/:familyId/assessments`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **GET** | `/api/v1/life-events` | `JwtAuthGuard` | None | `{ success: true, data: LifeEvent[] }` | Lists all supported life events and category checklists. |
| **POST** | `/` | `JwtAuthGuard` | `CreateAssessmentDto` (lifeEventId, memberId) | `{ success: true, data: ReadinessAssessment }` | Evaluates vault document files and generates scores. |
| **GET** | `/` | `JwtAuthGuard` | Pagination query | Paginated `ReadinessAssessment[]` | Lists past assessment audits in the workspace. |
| **GET** | `/:assessmentId` | `JwtAuthGuard` | Path IDs | `{ success: true, data: AssessmentDetails }` | Retrieves checklist details, matches, and gaps. |

---

## 9. Notifications Module
Delivers in-app alerts regarding processing statuses, mismatches, and validity expiries.
*   **Base Controller Path**: `/api/v1/families/:familyId/notifications`

| HTTP Method | Route Path | Guard / Auth | Request DTO / Payload | Response Format | Purpose / Details |
|---|---|---|---|---|---|
| **GET** | `/` | `JwtAuthGuard` | Pagination query + status filter | Paginated `Notification[]` | Lists unread/read warnings and alerts. |
| **PATCH** | `/:notificationId/read` | `JwtAuthGuard` | Path IDs | `{ success: true, data: Notification }` | Marks status of an alert as read (PATCH implementation). |
| **PUT** | `/:notificationId/read` | `JwtAuthGuard` | Path IDs | `{ success: true, data: Notification }` | Marks status of an alert as read (PUT implementation for specification fallback). |
