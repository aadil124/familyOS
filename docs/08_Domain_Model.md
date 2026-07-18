# Domain Model

This document defines the core business domains, aggregates, entity ownership mappings, and relationships within the FamilyOS AI platform, establishing clear boundaries for developers.

---

## 1. Domain Boundaries

FamilyOS AI is divided into four main sub-domains:
1. **Identity & Access Management (Core)**: Handles user registration, authentication credentials, security sessions, and JWT tokens.
2. **Family Workspace & Membership (Core)**: Manages workspace boundaries, member profiles, and relationship attributes.
3. **Document Repository & Storage (Supporting)**: Handles file uploads, storage references, document types, and file metadata.
4. **Readiness & AI Intelligence (Differentiating)**: Orchestrates text extraction (OCR), AI entity parsing, life event matching, scoring, alerts, and conversational support.

```
+-------------------------------------------------------------------------------+
|                                  Identity & Access                            |
|                                                                               |
|   [User] <=======> [RefreshToken]                                             |
+-------------------------------------------------------------------------------+
                                        ||
                                        || (owns)
                                        \/
+-------------------------------------------------------------------------------+
|                               Family Workspace                                |
|                                                                               |
|   [Family (Workspace Boundary)] <=======> [FamilyMember]                       |
+-------------------------------------------------------------------------------+
                                        ||
                                        || (contains)
                                        \/
+-------------------------------------------------------------------------------+
|                               Document Repository                             |
|                                                                               |
|   [Document] <=======> [DocumentType]                                         |
+-------------------------------------------------------------------------------+
                                        ||
                                        || (feeds text & meta)
                                        \/
+-------------------------------------------------------------------------------+
|                          Readiness & AI Intelligence                          |
|                                                                               |
|   [OCRResult] =====> [DocumentAnalysis] =====> [ReadinessAssessment]          |
|   [LifeEvent]                                 [Notification]                  |
|   [AIConversation] =====> [AIMessage]                                         |
+-------------------------------------------------------------------------------+
```

---

## 2. Aggregates & Entity Ownership

### 2.1 User & Session Aggregate
- **Root Entity**: `User`
- **Bound Entities**: `RefreshToken`
- **Ownership Rules**:
  - A `User` owns their profile and active refresh tokens.
  - Deleting a `User` soft-deletes the profile and cascades deletion/revocation to all related `RefreshToken` records.

### 2.2 Family Workspace Aggregate
- **Root Entity**: `Family`
- **Bound Entities**: `FamilyMember`
- **Ownership Rules**:
  - A `Family` is the security boundary.
  - A `Family` belongs to a single `User` (the Owner).
  - A `FamilyMember` exists strictly inside a single `Family`. If a `Family` is soft-deleted, all its member profiles are automatically rendered inaccessible.

### 2.3 Document Aggregate
- **Root Entity**: `Document`
- **Bound Entities**: `DocumentType`, `OCRResult`, `DocumentAnalysis`
- **Ownership Rules**:
  - A `Document` belongs to a `Family` and is optionally associated with a specific `FamilyMember`.
  - An `OCRResult` and `DocumentAnalysis` cannot exist without a parent `Document`. Deleting a `Document` soft-deletes its metadata and deletes its OCR and AI extraction records.

### 2.4 Readiness & Conversation Aggregate
- **Root Entity**: `ReadinessAssessment`, `AIConversation`
- **Bound Entities**: `AIMessage`, `Notification`
- **Ownership Rules**:
  - A `ReadinessAssessment` belongs to a `Family` and optionally references a `FamilyMember`.
  - An `AIConversation` is bound to a `Family` and a `User`.
  - `AIMessage` records exist strictly within an `AIConversation`.
  - `Notification` records belong to a `Family` and target a `User`.

---

## 3. Domain Responsibilities

### 3.1 User Domain
- Authenticate credentials safely.
- Maintain profile information.
- Issue and rotate access/refresh tokens.

### 3.2 Family Domain
- Maintain workspace isolation.
- Prevent cross-family data leakage.
- Manage family member profiles and relationships (e.g. Spouse, Child, Self).

### 3.3 Document Domain
- Coordinate file storage using third-party providers (Cloudinary).
- Track document lifecycle states (Uploading, Processing, Active, Deleted).
- Group documents by categories (using `DocumentType`).

### 3.4 AI & Readiness Domain
- Extract text from document images/PDFs.
- Identify key attributes (e.g., expiry date, name, document ID) using LLMs.
- Compare extracted facts against life event requirement checklists.
- Generate readiness scores and detect discrepancies (name mismatches, expirations).
- Assist users with questions using natural language.
