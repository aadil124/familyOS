# AI Architecture

This document defines the roles, prompt boundaries, and integration interfaces for AI components within the FamilyOS AI platform, ensuring strict separation of concerns.

---

## 1. Core AI Responsibilities & Boundaries

The AI subsystem is structured into five isolated layers to prevent single-prompt bottlenecks and simplify maintenance:

```
+------------------+     Text     +----------------------+     JSON     +------------------------+
|  OCR Integration | -----------> | AI Metadata Extract  | -----------> |  Knowledge Generation  |
+------------------+              +----------------------+              +------------------------+
                                                                                    |
                                                                                    v
                                  +----------------------+              +------------------------+
                                  |     AI Assistant     | <----------- |  Readiness Evaluator   |
                                  +----------------------+   Context    +------------------------+
```

---

## 2. Component Specifications

### 2.1 OCR Integration Layer
- **Role**: Extract raw, unstructured text from uploaded files (images, PDFs).
- **Interface**: Takes a file buffer or secure URL and returns raw UTF-8 string text.
- **Boundaries**: Performs no logical reasoning, classification, or correction. It only outputs what is visually present in the image.

### 2.2 AI Metadata Extraction Layer
- **Role**: Convert raw OCR text into structured JSON matching the schema for a specific document type (Passport, PAN Card, Aadhaar, Driver's License).
- **Interface**: Takes raw OCR text and a target schema, and returns structured JSON (e.g. `{ documentId: string, fullName: string, expiresAt: Date }`) and extraction confidence scores.
- **Boundaries**: Strictly maps entities. If text is missing or illegible, it outputs `null` and assigns a low confidence rating. It does not make assumptions or infer missing details.

### 2.3 Knowledge Generation Layer (Discrepancy Engine)
- **Role**: Cross-reference extracted document facts (such as Name and Address spelling) against the user's workspace profile.
- **Interface**: Takes multiple document extraction results and evaluates Levenshtein distance/token match indicators.
- **Boundaries**: Does not rewrite database records. It only identifies inconsistencies and triggers alerts for user review.

### 2.4 Readiness Explanation Layer
- **Role**: Explain why a readiness score is low and list the required steps to become prepared.
- **Interface**: Takes the output of a rule evaluation (e.g., "Missing Passport, PAN name mismatch") and returns a clear, bulleted summary of steps in plain language.
- **Boundaries**: It does not make up requirements. It only interprets the rules engine's findings.

### 2.5 AI Assistant Layer
- **Role**: Act as an interactive helper, answering questions about family documents.
- **Interface**: Takes active conversation logs, the user's latest query, and a context block containing only active document summaries and readiness assessments.
- **Boundaries**:
  - Restricts responses strictly to the provided document context.
  - Refuses to answer general questions outside the family vault scope.
  - Never provides official legal, financial, or government registration advice.
  - Standard fallback response for out-of-scope queries: *"I can only answer questions related to your family's uploaded documents and readiness checklists."*
