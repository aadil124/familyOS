# Document Processing Architecture

This document describes the end-to-end processing pipeline for documents uploaded to FamilyOS AI, outlining states, transitions, failure management, and component ownership.

---

## 1. End-to-End Processing Lifecycle

The lifecycle of an uploaded document transitions through a sequential pipeline, converting raw image/PDF files into structured, context-aware family knowledge:

```
[ Upload ]
   | (FE generates direct signed upload parameters, submits to Cloudinary)
   v
[ Storage ]
   | (FE receives Cloudinary asset ID, registers file with Backend)
   v
[ Processing ] (DB status: PENDING)
   | (Backend triggers async extraction task)
   v
[ OCR Extraction ] (DB status: OCR_PROCESSING)
   | (OCR service extracts raw text, saves to OCRResult table)
   v
[ AI Extraction ] (DB status: AI_PROCESSING)
   | (LLM extracts structured entities: Name, Date of Birth, Expiry, Doc ID)
   v
[ Knowledge Mapping ] (DB status: SUCCESS)
   | (Data matches user profile; discrepancy engines compare facts)
   v
[ Readiness Evaluation ]
   | (Re-evaluates completeness checklists for active Life Events)
   v
[ Notifications Dispatch ]
   | (Dispatches alerts if expirations, mismatches, or gaps are found)
   v
[ AI Assistant Readiness ]
   | (Facts are loaded into vector context for user chat queries)
```

---

## 2. Processing States & Transitions

The document entity maintains two state trackers in the database:
- `uploadStatus`: Tracks storage file status (`PENDING`, `SUCCESS`, `FAILED`).
- `processingStatus`: Tracks extraction pipeline status (`PENDING`, `OCR_PROCESSING`, `AI_PROCESSING`, `SUCCESS`, `FAILED`).

### State Transition Table

| Source State | Event Trigger | Target State | DB Field Updated |
| :--- | :--- | :--- | :--- |
| `PENDING` | Upload starts | `PENDING` | `uploadStatus = PENDING` |
| `PENDING` | Upload completes in storage | `SUCCESS` | `uploadStatus = SUCCESS` |
| `PENDING` | Document metadata registered | `PENDING` | `processingStatus = PENDING` |
| `PENDING` | OCR job dispatched | `OCR_PROCESSING` | `processingStatus = OCR_PROCESSING` |
| `OCR_PROCESSING` | OCR text saved to DB | `AI_PROCESSING` | `processingStatus = AI_PROCESSING` |
| `AI_PROCESSING` | AI parsed metadata saved | `SUCCESS` | `processingStatus = SUCCESS` |
| Any State | Pipeline error or timeout | `FAILED` | `processingStatus = FAILED` |

---

## 3. Component Ownership

- **Storage Stage**: Owned by the **Frontend** (direct client-to-Cloudinary upload via signature) and **Cloudinary** (file hosting).
- **Registration Stage**: Owned by **Document Repository** (registers references and metadata in database).
- **OCR Stage**: Owned by **OCR Module** (sends image to OCR provider, stores plain text result).
- **AI Extraction Stage**: Owned by **AI Module** (structures extracted text into JSON fields via LLM).
- **Readiness Stage**: Owned by **Readiness Engine** (validates parameters against life event rules).
- **Notification Stage**: Owned by **Alerts Module** (scans values for expirations and name mismatches).

---

## 4. Failure Handling & Retry Strategy

### 4.1 Storage Failures
- **Scenario**: File upload fails during client upload.
- **Handling**: Frontend handles retries directly (up to 3 times). If it still fails, the upload is aborted, and no database record is created.

### 4.2 OCR Failures
- **Scenario**: Image extraction fails or returns empty text.
- **Handling**: Mark `processingStatus` as `FAILED` and record the failure reason. The document remains visible in the library with a "Failed" status, allowing the user to manually trigger a retry.

### 4.3 AI Extraction Failures
- **Scenario**: LLM fails to return valid JSON matching the schema.
- **Handling**: 
  - **Auto-Retry**: The system will retry the AI extraction task once with a lower temperature setting.
  - **Manual Fallback**: If it fails again, set `processingStatus` to `SUCCESS` but mark `reviewStatus` as `PENDING_REVIEW` with empty fields, prompting the user to type in the values manually.

### 4.4 Discrepancy & Alert Failures
- **Scenario**: Readiness matching or name validation fails.
- **Handling**: Failures in readiness score calculations do not fail the document status. Calculations are logged, and a default score of `0%` is shown on the UI while a background warning is recorded.
