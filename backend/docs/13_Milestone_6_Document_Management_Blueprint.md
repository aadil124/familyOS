# Milestone 6 – Document Management Implementation Blueprint

This document defines the implementation specifications for Milestone 6 (Document Management), outlining endpoints, service structures, file upload workflows, and verification requirements.

---

## 1. Objectives & Scope

### 1.1 Objectives
Enable users to securely upload, group, retrieve, and delete documents within their family workspace. All uploads bypass the NestJS backend to upload directly to Cloudinary, ensuring performance scaling.

### 1.2 Scope
- **Storage Configuration**: Cloudinary integration for signed direct uploads and signed download links.
- **Persistence**: Database CRUD mapping for the `Document` and `DocumentType` tables.
- **REST API Endpoints**: Expose document management endpoints under `/api/v1/families/:familyId/documents`.
- **Validation**: Enforce file type restrictions and size limits.
- **Parent Hierarchy Check**: Validate that documents belong to the specified family and member context.

---

## 2. API Endpoint Coverage

All endpoints require JWT authorization and are prefixed with `/api/v1/families/:familyId/documents`:

- `POST /upload-signature`: Generates secure signed credentials for client-side uploads directly to Cloudinary.
- `POST /`: Registers the uploaded file reference in the database, setting `uploadStatus = SUCCESS` and `processingStatus = PENDING`.
- `GET /`: Lists all active (non-soft-deleted) documents for the family workspace. Supports filtering by `familyMemberId` and `documentTypeId`.
- `GET /:documentId`: Retrieves details of a specific document.
- `GET /:documentId/download`: Generates a temporary timed download URL for the file.
- `PATCH /:documentId/metadata`: Updates editable metadata fields (e.g. `displayName`, `familyMemberId`, `documentTypeId`).
- `DELETE /:documentId`: Performs a soft delete by setting `deletedAt` in the database. Returns `204 No Content`.

---

## 3. Storage Integration & Upload Workflow

### 3.1 Cloudinary Directory Structure
All document assets are stored in the Cloudinary workspace organized by environment and family boundaries:
`familyos/{environment}/families/{familyId}/documents/{documentId}`

### 3.2 Direct Signed Upload Sequence
```
1. Client -> POST /families/:familyId/documents/upload-signature
   - Backend generates API parameters (timestamp, folder, public_id, upload_preset).
   - Backend signs the parameters using the CLOUDINARY_API_SECRET.
   - Backend returns parameters and the signature to the Client.
2. Client -> POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
   - Client sends file alongside signed parameters.
   - Cloudinary verifies signature, stores file, and returns asset details (public_id, url).
3. Client -> POST /families/:familyId/documents
   - Client sends Cloudinary references (public_id, file name, file type).
   - Backend validates details, saves Document row, and initiates background processing.
```

---

## 4. Architecture & Responsibility Layers

### 4.1 Controllers (`DocumentsController`)
- Binds routes, extracts path and body parameters, and delegates operations directly to `DocumentsService`.
- Exposes Swagger decorators detailing schemas and status codes.
- Implements no business checks or database queries.

### 4.2 Services (`DocumentsService`)
- Validates the workspace hierarchy (verifying `familyId` exists and matches parameters).
- Communicates with `CloudinaryService` to generate signatures andTimed signed download URLs.
- Orchestrates database CRUD operations through `DocumentsRepository`.
- Sets initial processing flags (`uploadStatus: SUCCESS`, `processingStatus: PENDING`).

### 4.3 Repositories (`DocumentsRepository`)
- Encapsulates database access for the `Document` and `DocumentType` models.
- Exposes generic methods (`create`, `findById`, `findMany`, `update`, `softDelete`).
- Returns raw persistence results without business decisions.

---

## 5. Validation Rules

- **File Types**: Accepted formats are limited to `image/jpeg`, `image/png`, `application/pdf`. Unsupported formats are rejected on signature request.
- **File Size**: Maximum file size limit is **10MB**.
- **Hierarchy Integrity**: When registering or updating a document:
  - If a `familyMemberId` is provided, the backend must verify that the member exists and belongs to the specified `familyId`.
  - If a `documentTypeId` is provided, the backend must verify that the document type is active.

---

## 6. Testing & Acceptance Criteria

### 6.1 Unit Tests
- **DocumentsRepository**: Assert that database queries execute correctly and soft-delete updates `deletedAt` without removing rows.
- **DocumentsService**:
  - Verify signature generators use correct hashing algorithms.
  - Verify that hierarchy validations throw `NotFoundException` on mismatched family or member contexts.

### 6.2 E2E Tests
- Assert that calling endpoints without a Bearer token returns `401 Unauthorized`.
- **Validation**: Assert that registering a document with an invalid `familyMemberId` or `documentTypeId` returns `400 Bad Request`.
- **CRUD Lifecycle**:
  - Generate signature -> Register file -> Retrieve in list -> Fetch details -> Update metadata -> Soft delete -> Verify subsequent reads return `404 Not Found`.

### 6.3 Acceptance Criteria
- Document uploads bypass backend servers and save directly to Cloudinary.
- Document links are secure, expiring after 15 minutes.
- All test assertions compile and pass successfully.
- Application builds cleanly via `npm run build`.
