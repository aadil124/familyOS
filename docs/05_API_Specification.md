# FamilyOS AI API Specification

## 1. Introduction

This document defines the REST API contract for the FamilyOS AI MVP. It acts as the single source of truth for the interface between the frontend application and the backend API, enabling parallel development.

This API specification defines endpoints, request structures, response formats, and behavioral rules. It explicitly does not define backend implementation details such as code structure, controllers, DTOs, or Prisma schemas.

## 2. API Design Principles

| Principle | Description |
|---|---|
| RESTful Architecture | Resources are represented as nouns (e.g., `/families`, `/documents`), and HTTP methods define actions (`GET`, `POST`, `PUT`, `DELETE`). |
| JSON First | All requests (unless `multipart/form-data`) and responses use `application/json`. |
| Consistent Responses | Success and error responses follow a strict, predictable JSON wrapper. |
| Secure by Default | All endpoints require authentication unless explicitly marked otherwise. |
| Sub-Resource Routing | Nested resources use hierarchical paths (e.g., `/families/{familyId}/members`). |

## 3. Authentication Strategy

FamilyOS AI uses **JWT (JSON Web Token)** for authentication:
- **Access Token:** Passed in the `Authorization` header as a Bearer token (`Authorization: Bearer <token>`).
- **Refresh Token:** Used to obtain a new access token when it expires.

## 4. Versioning Strategy

APIs are versioned via the URL path. All MVP endpoints are placed under `/api/v1/`.

## 5. Standard Request Format

For endpoints accepting JSON payloads, the request headers must include:
```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

## 6. Standard Response Format

All successful JSON responses follow a uniform wrapper:

```json
{
  "success": true,
  "data": { ... }, 
  "meta": { ... } 
}
```

*Note: `data` contains the core payload. `meta` is optional and contains pagination or processing details.*

## 7. Standard Error Response Format

All error responses return a standardized payload:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided data is invalid.",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email address."
      }
    ]
  }
}
```

---

## 8. Authentication APIs

### Register
- **Endpoint:** `/api/v1/auth/register`
- **HTTP Method:** `POST`
- **Purpose:** Create a new user account.
- **Authentication Required:** No
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "u_1", "fullName": "John Doe", "email": "john@example.com" },
      "accessToken": "eyJhbG...",
      "refreshToken": "def456..."
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid input format.
  - `409 Conflict`: Email already exists.
- **Authorization Rules:** Open endpoint.
- **Validation Rules:** Valid email, password length/complexity rules.
- **Notes:** Also automatically creates a default Family workspace for the user.

### Login
- **Endpoint:** `/api/v1/auth/login`
- **HTTP Method:** `POST`
- **Purpose:** Authenticate an existing user.
- **Authentication Required:** No
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "u_1", "fullName": "John Doe", "email": "john@example.com" },
      "accessToken": "eyJhbG...",
      "refreshToken": "def456..."
    }
  }
  ```
- **Error Responses:** `401 Unauthorized`: Invalid email or password.
- **Authorization Rules:** Open endpoint.
- **Validation Rules:** Valid email format.

### Refresh Token
- **Endpoint:** `/api/v1/auth/refresh`
- **HTTP Method:** `POST`
- **Purpose:** Issue a new access token using a refresh token.
- **Authentication Required:** No
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "refreshToken": "def456..."
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbG...",
      "refreshToken": "new789..."
    }
  }
  ```
- **Error Responses:** `401 Unauthorized`: Invalid or expired refresh token.
- **Authorization Rules:** Open endpoint.
- **Validation Rules:** Refresh token must be present.

### Logout
- **Endpoint:** `/api/v1/auth/logout`
- **HTTP Method:** `POST`
- **Purpose:** Invalidate the current session and refresh token.
- **Authentication Required:** Yes
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "refreshToken": "def456..."
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "message": "Successfully logged out" }
  }
  ```
- **Error Responses:** `400 Bad Request`.
- **Authorization Rules:** Requires valid access token.
- **Validation Rules:** Refresh token string must be present.

### Current User
- **Endpoint:** `/api/v1/auth/me`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve the currently authenticated user's profile.
- **Authentication Required:** Yes
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "u_1",
      "fullName": "John Doe",
      "email": "john@example.com",
      "createdAt": "2026-07-17T08:00:00Z"
    }
  }
  ```
- **Error Responses:** `401 Unauthorized`.
- **Authorization Rules:** User can only fetch their own profile.
- **Validation Rules:** N/A.

---

## 9. Family APIs

### Create Family
- **Endpoint:** `/api/v1/families`
- **HTTP Method:** `POST`
- **Purpose:** Create a new family workspace.
- **Authentication Required:** Yes
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "name": "The Doe Family"
  }
  ```
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "id": "f_1",
      "name": "The Doe Family",
      "ownerUserId": "u_1",
      "status": "active"
    }
  }
  ```
- **Error Responses:** `400 Bad Request`.
- **Authorization Rules:** User can create a family workspace.
- **Validation Rules:** `name` must not be empty.
- **Notes:** Usually, a primary family is created on registration. This supports future multi-workspace scaling.

### Get Family
- **Endpoint:** `/api/v1/families/{familyId}`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve family workspace details.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "f_1",
      "name": "The Doe Family",
      "status": "active"
    }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must be the owner of the `familyId`.
- **Validation Rules:** `familyId` format.

### Update Family
- **Endpoint:** `/api/v1/families/{familyId}`
- **HTTP Method:** `PUT`
- **Purpose:** Update family workspace name or details.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "name": "The Doe Family Vault"
  }
  ```
- **Success Response:** `200 OK`
- **Error Responses:** `400 Bad Request`, `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must be the owner of the `familyId`.
- **Validation Rules:** `name` must not be empty.

---

## 10. Family Member APIs

### List Members
- **Endpoint:** `/api/v1/families/{familyId}/members`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve all members in a family workspace.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** Standard pagination (`page`, `limit`).
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "m_1",
        "fullName": "Jane Doe",
        "relationship": "Spouse",
        "status": "active"
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 20 }
  }
  ```
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must be the owner of `familyId`.
- **Validation Rules:** N/A.

### Create Member
- **Endpoint:** `/api/v1/families/{familyId}/members`
- **HTTP Method:** `POST`
- **Purpose:** Add a member to the family workspace.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "relationship": "Spouse",
    "dateOfBirth": "1990-01-01"
  }
  ```
- **Success Response:** `201 Created`
- **Error Responses:** `400 Bad Request`, `403 Forbidden`.
- **Authorization Rules:** User must be the owner of `familyId`.
- **Validation Rules:** `fullName` is required. `dateOfBirth` must not be in the future.

### Get Member
- **Endpoint:** `/api/v1/families/{familyId}/members/{memberId}`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve specific member details.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `memberId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`, `memberId` must belong to `familyId`.
- **Validation Rules:** N/A.

### Update Member
- **Endpoint:** `/api/v1/families/{familyId}/members/{memberId}`
- **HTTP Method:** `PUT`
- **Purpose:** Update family member details.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `memberId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "relationship": "Wife"
  }
  ```
- **Success Response:** `200 OK`
- **Error Responses:** `400 Bad Request`, `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`, `memberId` must belong to `familyId`.
- **Validation Rules:** At least one field required to update.

### Delete Member
- **Endpoint:** `/api/v1/families/{familyId}/members/{memberId}`
- **HTTP Method:** `DELETE`
- **Purpose:** Soft delete a family member.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `memberId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "message": "Member successfully deleted" }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`, `memberId` must belong to `familyId`.
- **Validation Rules:** N/A.

---

## 11. Document APIs

### Upload Document
- **Endpoint:** `/api/v1/families/{familyId}/documents`
- **HTTP Method:** `POST`
- **Purpose:** Upload a document file and create a record.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:** `multipart/form-data`
  - `file`: (Binary File)
  - `familyMemberId`: (String, Optional)
  - `categoryId`: (String, Optional)
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "id": "doc_1",
      "originalFileName": "passport.pdf",
      "uploadStatus": "uploaded",
      "processingStatus": "pending"
    }
  }
  ```
- **Error Responses:** `400 Bad Request` (invalid file type/size), `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`. If `familyMemberId` is provided, it must belong to `familyId`.
- **Validation Rules:** Supported file types only, within size limits.
- **Notes:** File is uploaded to Cloudinary, triggering backend OCR/AI processing async.

### List Documents
- **Endpoint:** `/api/v1/families/{familyId}/documents`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve a list of documents in the workspace.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** Standard pagination, `familyMemberId` (optional filter), `categoryId` (optional filter), `processingStatus` (optional filter).
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "doc_1",
        "displayName": "passport.pdf",
        "familyMemberId": "m_1",
        "processingStatus": "completed",
        "issueStatus": "none"
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 20 }
  }
  ```
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** N/A.

### Get Document
- **Endpoint:** `/api/v1/families/{familyId}/documents/{documentId}`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve detailed document metadata.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `documentId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "doc_1",
      "displayName": "passport.pdf",
      "processingStatus": "completed",
      "createdAt": "2026-07-17T08:00:00Z"
    }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`, `documentId` must belong to `familyId`.
- **Validation Rules:** N/A.

### Update Metadata
- **Endpoint:** `/api/v1/families/{familyId}/documents/{documentId}`
- **HTTP Method:** `PUT`
- **Purpose:** Update document displayName, category, or member association.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `documentId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "displayName": "My Passport",
    "familyMemberId": "m_1"
  }
  ```
- **Success Response:** `200 OK`
- **Error Responses:** `400 Bad Request`, `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`, `documentId` must belong to `familyId`.
- **Validation Rules:** Fields cannot be empty.

### Delete Document
- **Endpoint:** `/api/v1/families/{familyId}/documents/{documentId}`
- **HTTP Method:** `DELETE`
- **Purpose:** Soft delete a document.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `documentId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** N/A.

### Download/View Document
- **Endpoint:** `/api/v1/families/{familyId}/documents/{documentId}/download`
- **HTTP Method:** `GET`
- **Purpose:** Generate a secure URL to access the document asset from storage.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `documentId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "url": "https://secure-cloudinary-url.com/...",
      "expiresIn": 3600
    }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** N/A.

---

## 12. Dashboard APIs

### Dashboard Summary
- **Endpoint:** `/api/v1/families/{familyId}/dashboard/summary`
- **HTTP Method:** `GET`
- **Purpose:** Provide aggregated counts and alerts for the workspace dashboard.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "totalMembers": 4,
      "totalDocuments": 12,
      "alerts": {
        "expiring": 2,
        "mismatches": 1,
        "missing": 3
      }
    }
  }
  ```
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** N/A.

---

## 13. OCR Status APIs

### Get OCR Result
- **Endpoint:** `/api/v1/families/{familyId}/documents/{documentId}/ocr`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve OCR extraction status and result.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `documentId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "status": "completed",
      "confidenceScore": 0.95,
      "processedAt": "2026-07-17T08:05:00Z"
    }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** N/A.

---

## 14. AI Analysis APIs

### Get Document Analysis
- **Endpoint:** `/api/v1/families/{familyId}/documents/{documentId}/analysis`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve AI-derived document intelligence.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `documentId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "status": "completed",
      "detectedDocumentType": "Passport",
      "extractedFields": {
        "passportNumber": "A1234567"
      },
      "mismatchFlags": [],
      "confidenceScore": 0.98,
      "analysisSummary": "Standard passport document identified."
    }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** N/A.

---

## 15. AI Chat APIs

### List Conversations
- **Endpoint:** `/api/v1/families/{familyId}/chat/conversations`
- **HTTP Method:** `GET`
- **Purpose:** List chat conversations.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** Standard pagination.
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.

### Create Conversation
- **Endpoint:** `/api/v1/families/{familyId}/chat/conversations`
- **HTTP Method:** `POST`
- **Purpose:** Start a new AI assistant conversation.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "title": "Applying for passport"
  }
  ```
- **Success Response:** `201 Created`
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.

### Send Message
- **Endpoint:** `/api/v1/families/{familyId}/chat/conversations/{conversationId}/messages`
- **HTTP Method:** `POST`
- **Purpose:** Send a message to the AI assistant and receive a response.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `conversationId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "content": "Do I have the required documents for a driving license?"
  }
  ```
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "role": "assistant",
      "content": "Based on your vault, you are missing an address proof...",
      "safetyStatus": "safe"
    }
  }
  ```
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`, conversation must belong to `familyId`.
- **Validation Rules:** `content` cannot be empty.

### List Messages
- **Endpoint:** `/api/v1/families/{familyId}/chat/conversations/{conversationId}/messages`
- **HTTP Method:** `GET`
- **Purpose:** Get chat history for a conversation.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `conversationId` (string)
- **Query Parameters:** Standard pagination.
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.

---

## 16. Life Event APIs

### List Supported Life Events
- **Endpoint:** `/api/v1/life-events`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve available life event scenarios.
- **Authentication Required:** Yes
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "le_1",
        "name": "Driving License Application",
        "normalizedKey": "driving_license"
      }
    ]
  }
  ```
- **Error Responses:** None.
- **Authorization Rules:** Authenticated users.
- **Validation Rules:** N/A.

---

## 17. Readiness Assessment APIs

### Create Readiness Assessment
- **Endpoint:** `/api/v1/families/{familyId}/assessments`
- **HTTP Method:** `POST`
- **Purpose:** Run a readiness check for a specific life event and member.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** None
- **Request Body:**
  ```json
  {
    "lifeEventId": "le_1",
    "familyMemberId": "m_1"
  }
  ```
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "id": "ra_1",
      "status": "completed",
      "readinessLevel": "Partial",
      "missingDocuments": ["Address Proof"],
      "nextSteps": "Upload an address proof document to improve readiness."
    }
  }
  ```
- **Error Responses:** `400 Bad Request`, `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.
- **Validation Rules:** `lifeEventId` is required.

### List Assessments
- **Endpoint:** `/api/v1/families/{familyId}/assessments`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve past readiness checks.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** Standard pagination.
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.

### Get Assessment Details
- **Endpoint:** `/api/v1/families/{familyId}/assessments/{assessmentId}`
- **HTTP Method:** `GET`
- **Purpose:** Fetch a specific readiness output.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `assessmentId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.

---

## 18. Notification APIs

### List Notifications
- **Endpoint:** `/api/v1/families/{familyId}/notifications`
- **HTTP Method:** `GET`
- **Purpose:** Retrieve in-app alerts and notifications.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string)
- **Query Parameters:** Standard pagination, `status` (unread, read).
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "n_1",
        "type": "expiry",
        "severity": "warning",
        "title": "Passport Expiring",
        "message": "Jane's passport expires in 30 days.",
        "status": "unread"
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 20 }
  }
  ```
- **Error Responses:** `403 Forbidden`.
- **Authorization Rules:** User must own `familyId`.

### Mark Notification as Read
- **Endpoint:** `/api/v1/families/{familyId}/notifications/{notificationId}/read`
- **HTTP Method:** `PUT`
- **Purpose:** Mark an alert as read or dismissed.
- **Authentication Required:** Yes
- **Path Parameters:** `familyId` (string), `notificationId` (string)
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
- **Error Responses:** `403 Forbidden`, `404 Not Found`.
- **Authorization Rules:** User must own `familyId`.

---

## 19. Health Check APIs

### System Health
- **Endpoint:** `/api/v1/health`
- **HTTP Method:** `GET`
- **Purpose:** Used by monitoring tools (Vercel, Railway) to check API status.
- **Authentication Required:** No
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** None
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "status": "ok", "timestamp": "2026-07-17T08:00:00Z" }
  }
  ```
- **Error Responses:** `500 Internal Server Error` (if DB is unreachable).
- **Authorization Rules:** Open.
- **Validation Rules:** N/A.

---

## 20. Pagination Standard

All list endpoints support offset/limit based pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20, max: 100)

---

## 21. Filtering Standard

Filters are passed as query parameters using exact match unless specified otherwise.
Example: `GET /api/v1/families/{id}/documents?processingStatus=completed&categoryId=cat_1`

---

## 22. Sorting Standard

Sorting is applied via `sortBy` and `sortOrder` query parameters:
- `sortBy`: Field name to sort by (e.g., `createdAt`)
- `sortOrder`: `asc` or `desc` (default: `desc`)

---

## 23. Validation Errors

Validation rules are enforced at the API boundary. Failure results in a `400 Bad Request` with an `error.details` array specifying the exact fields and issues, allowing the frontend to map errors directly to form inputs.

---

## 24. Authorization Rules

1. **Authentication:** A valid JWT access token is required for all protected endpoints.
2. **Workspace Isolation:** Every endpoint under `/families/{familyId}/*` verifies that the authenticated user is the `ownerUserId` of the specified `familyId`. 
3. **Cross-scope Prevention:** Child entities (members, documents, chats, assessments) must belong to the `familyId` specified in the URL path.

---

## 25. HTTP Status Codes

| Code | Meaning | Usage |
|---|---|---|
| `200 OK` | Success | Standard successful response. |
| `201 Created` | Created | Successful resource creation. |
| `400 Bad Request` | Bad Request | Validation errors, missing fields, or malformed data. |
| `401 Unauthorized` | Unauthorized | Missing, invalid, or expired JWT token. |
| `403 Forbidden` | Forbidden | Authenticated, but lacks ownership/permission for the resource. |
| `404 Not Found` | Not Found | Resource does not exist or user lacks permission to see it. |
| `409 Conflict` | Conflict | Resource already exists (e.g., duplicate email). |
| `500 Internal Server Error` | Server Error | Unhandled backend failure. |

---

## 26. API Security

- **HTTPS Only:** All traffic is encrypted.
- **Token Storage:** Frontend must store access tokens securely in memory and refresh tokens in HttpOnly cookies (preferred) or secure storage.
- **Input Sanitization:** All payload inputs are validated and sanitized to prevent NoSQL/SQL injection and XSS.
- **Data Minimization:** APIs avoid exposing raw database IDs if internal-only, and minimize sensitive data duplication.

---

## 27. Rate Limiting Strategy

To protect AI limits and server health, standard rate-limiting applies:
- **Standard APIs:** IP-based limits (e.g., 100 req/min).
- **AI/Upload APIs:** Stricter user-based limits (e.g., 10 uploads/min, 20 chats/min).
- **Status Code:** Returns `429 Too Many Requests` when limits are exceeded.

---

## 28. Future API Expansion

The `/api/v1/` contract is designed to support future capabilities without breaking changes:
- **Collaborators:** A new `/families/{id}/collaborators` sub-route will handle sharing and permissions.
- **Advisor Access:** Future scopes will allow JWTs to express external professional permissions.
- **Webhooks:** For external notification integrations (WhatsApp, email).
- **Multi-Workspace:** The `familyId` path prefix is already built to support users owning multiple workspaces seamlessly.
