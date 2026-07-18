# Document Management Architecture

This document defines the storage strategy, lifecycle, metadata ownership, and integration guidelines for documents within the FamilyOS AI platform. It serves as the implementation reference for Milestone 6.

---

## 1. Document Lifecycle States

Every document record in the system goes through the following lifecycle states:

```
[ DRAFT ] (File uploading)
   |
   v
[ UPLOADED ] (File stored in Cloudinary, metadata registered in DB)
   |
   v
[ PROCESSING ] (Extracting text and running AI analysis)
   |
   +-------> [ ACTIVE ] (Processing successful, verified by user)
   |
   +-------> [ FAILED ] (Processing failed, editable/viewable)
   |
   v
[ ARCHIVED ] (Manually archived, excluded from active dashboards)
   |
   v
[ DELETED ] (Soft-deleted, excluded from all active queries)
```

- **Active State**: The document is verified, fully indexed, and available for AI conversations and readiness scoring.
- **Soft-Deleted State**: Set by writing a timestamp to `deletedAt`. Files are excluded from normal queries but retained in the DB for audit/recovery.

---

## 2. Storage Strategy & Cloudinary Integration

### 2.1 Direct Signed Uploads
To prevent bottlenecking the NestJS backend, all file uploads bypass the backend API using Cloudinary's direct signed upload mechanism:

```
1. Client (FE) requests signed upload parameters from Backend.
2. Backend validates active session and returns Signed Upload Signature.
3. Client (FE) uploads file directly to Cloudinary using signature.
4. Client (FE) submits Cloudinary asset reference to Backend API.
5. Backend registers document record and triggers processing.
```

### 2.2 Asset Security & Delivery
- **Access Control**: Assets are stored in restricted folders under the `familyos/` namespace.
- **Signed URL Delivery**: Direct links to assets on Cloudinary are never exposed publicly. Accessing or displaying a document requires requesting a timed Signed Download URL (`expires_in = 15 minutes`) from the backend.

---

## 3. Metadata Ownership

Metadata is categorized into three layers:
1. **System Metadata** (System-owned): Mapped on creation (e.g. `id`, `familyId`, `uploadStatus`, `processingStatus`, `createdAt`).
2. **AI-Extracted Metadata** (AI-owned): Structured entities extracted from the OCR result (e.g. passport number, expiration date, full name). Marked as `reviewStatus = PENDING_REVIEW` until approved.
3. **User-Corrected Metadata** (User-owned): Field values corrected or manually input by the user. Once updated, the system marks the field source as `USER_VERIFIED` and locks the field from future AI overwrites.

---

## 4. Versioning & Deletion Strategy

### 4.1 Versioning
- The MVP supports a single active version per document record.
- If a user uploads a newer copy of an existing document (e.g., a renewed passport), it is registered as a **new** document record. The user can manually archive or delete the old passport record to keep their dashboard accurate.

### 4.2 Deletion & Cleanup
- **Soft Delete**: Deleting a document in the app updates `deletedAt` in the `Document` database table. The document immediately disappears from lists, search indices, and readiness assessments.
- **Physical Cleanup**: A background worker scans soft-deleted documents older than 30 days, deletes the physical asset from Cloudinary using the API, and permanently deletes the database records.
