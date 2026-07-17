# FamilyOS AI

**An intelligent, secure, and proactive vault for your family's critical documents.**

---

## 2. Overview

FamilyOS AI transforms how families manage, verify, and utilize their most important documents. 

**The Problem:** Families struggle to maintain up-to-date critical documents (passports, birth certificates, medical records). These documents are often scattered across physical folders or unorganized cloud drives. When life events occur (e.g., applying for a visa, registering for school), families face anxiety and delays discovering that documents are missing, expired, or contain mismatched information.

**The Solution:** FamilyOS AI acts as a proactive digital vault. It does not merely store documents; it uses Artificial Intelligence and Optical Character Recognition (OCR) to extract metadata, monitor expiration dates, cross-check identities, and evaluate a family's readiness for specific life events.

**Why It Matters:** It eliminates the manual burden of document auditing, preventing last-minute emergencies and securing sensitive data in an isolated, structured workspace.

---

## 3. Key Features

| Feature | Description |
|---|---|
| **Secure Family Document Vault** | Encrypted, centralized storage for family documents, physically and logically isolated by workspace. |
| **AI Document Analysis** | Automatically extracts metadata (names, dates, IDs) and classifies document types using LLMs. |
| **OCR Processing** | Converts scanned images and PDFs into machine-readable text for AI analysis. |
| **Readiness Assessment** | Deterministic engine that evaluates uploaded documents against rules for specific life events to generate a readiness score. |
| **AI Assistant** | A conversational interface strictly grounded in the family's uploaded documents to answer vault-specific queries without hallucination. |
| **Notifications** | Automated internal alerts for document expirations, identity mismatches, and missing requirements. |
| **Dashboard** | A centralized view summarizing family readiness, recent alerts, and document statistics. |
| **Multi-member Workspace** | Role-based organization allowing multiple family members to be tracked within a single administrative workspace. |

---

## 4. Technology Stack

### Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Hook Form, SWR/React Query

### Backend
- **Framework:** NestJS
- **Language:** TypeScript
- **Architecture:** Domain-Driven Design (DDD)
- **ORM:** Prisma

### Database
- **Primary Datastore:** Neon Serverless PostgreSQL

### AI
- **LLM Provider:** OpenAI API (Structured JSON Extraction & Chat)
- **OCR:** External OCR Provider (Vendor Agnostic Integration)

### Storage
- **Media Management:** Cloudinary (Secure signed URLs, binary storage)

### Deployment
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Railway

---

## 5. High-Level Architecture

FamilyOS AI employs a Modular Monolith architecture. The frontend is an SSR-optimized Next.js application, while the backend is a robust NestJS API following DDD principles. They communicate via secure REST APIs. Heavy AI and OCR workloads are processed asynchronously on the backend to maintain a highly responsive user interface.

```mermaid
flowchart TD
    Client[Next.js Frontend] --> CDN[Vercel CDN]
    CDN --> Next[Next.js App Router]
    
    Next --> Gateway[Railway Gateway]
    Gateway --> API[NestJS Backend API]
    
    API --> DB[(Neon PostgreSQL)]
    API --> Store[Cloudinary Storage]
    API --> AI[OpenAI API]
    API --> OCR[OCR Service]
    
    classDef frontend fill:#e1f5fe,stroke:#0288d1;
    classDef backend fill:#e8f5e9,stroke:#388e3c;
    classDef external fill:#fff3e0,stroke:#f57c00;
    
    class Client,CDN,Next frontend;
    class Gateway,API backend;
    class DB,Store,AI,OCR external;
```

---

## 6. Repository Structure

The monorepo structure logically separates the frontend, backend, and extensive architectural documentation.

```mermaid
flowchart LR
    Root[familyOS] --> Frontend[/frontend]
    Root --> Backend[/backend]
    Root --> Docs[/docs]
    
    Frontend --> App[/app]
    Frontend --> Features[/features]
    Frontend --> Components[/components]
    
    Backend --> Src[/src]
    Src --> Modules[/modules]
    Src --> Common[/common]
    
    Docs --> Arch[Architecture Blueprints]
    Docs --> Proc[Process Guidelines]
```

---

## 7. Documentation Index

The repository is thoroughly documented. All implementation details, architectural decisions, and workflows are detailed in the `/docs` directory.

| Document | Description |
|---|---|
| [`01_Project_Blueprint.md`](docs/01_Project_Blueprint.md) | High-level vision, scope, and target audience for the MVP. |
| [`02_PRD.md`](docs/02_PRD.md) | Product Requirements Document outlining features, user stories, and constraints. |
| [`03_System_Architecture.md`](docs/03_System_Architecture.md) | Core system components, boundaries, data flows, and technology selections. |
| [`04_Database_Design.md`](docs/04_Database_Design.md) | Logical schema, entity relationships, and database requirements. |
| [`05_API_Specification.md`](docs/05_API_Specification.md) | Comprehensive REST API contracts, routes, and payload definitions. |
| [`06_Backend_Architecture.md`](docs/06_Backend_Architecture.md) | NestJS structural blueprint, Domain-Driven Design layout, and request lifecycle. |
| [`07_Frontend_Architecture.md`](docs/07_Frontend_Architecture.md) | Next.js App Router configuration, state management, and component hierarchy. |
| [`08_AI_Architecture.md`](docs/08_AI_Architecture.md) | Integration strategy for OCR, structured LLM extraction, and chat bounding. |
| [`09_Git_Workflow.md`](docs/09_Git_Workflow.md) | Branching strategy, Pull Request standards, and release management rules. |
| [`10_Antigravity_Development_Guide.md`](docs/10_Antigravity_Development_Guide.md) | Standard operating procedures for AI-assisted development and quality gates. |
| [`11_Deployment.md`](docs/11_Deployment.md) | Hosting infrastructure strategy across Development, UAT, and Production. |
| [`12_Testing.md`](docs/12_Testing.md) | Quality assurance strategy covering unit, integration, and E2E testing levels. |
| [`13_Project_Task_Breakdown.md`](docs/13_Project_Task_Breakdown.md) | Detailed work breakdown structure, dependencies, and implementation roadmap. |
| [`14_Demo_Strategy.md`](docs/14_Demo_Strategy.md) | Presentation playbook, narrative flow, and live demonstration script. |

---

## 8. Development Workflow

FamilyOS AI employs a **Documentation-First** and **Architecture-First** methodology. 

Before any code is written, architectural blueprints are established in the `/docs` directory. Implementation relies on strict adherence to these blueprints. Development is accelerated using the Antigravity AI coding assistant, following a robust Git workflow (Squash Merges, Pull Request reviews, and CI testing) to maintain high code quality and prevent architectural drift.

---

## 9. Getting Started

### Prerequisites
- Node.js (v20+)
- Package manager (npm/yarn/pnpm)
- Docker (for local database instance, if preferred over cloud)
- API Keys (Neon, Cloudinary, OpenAI, OCR Provider)

### Installation Overview
1. Clone the repository.
2. Install dependencies in both the `/frontend` and `/backend` directories.
3. Configure environment variables in `.env` files based on provided templates.
4. Run database migrations to apply the Prisma schema.
5. Start the frontend and backend development servers.

### Environment Configuration
Environment variables dictate application behavior without hardcoding secrets. Categories include Authentication secrets, Database connection strings, Storage API keys, AI keys, and Application URLs.

### Development Workflow
Developers select tasks from the [Project Task Breakdown](docs/13_Project_Task_Breakdown.md), create feature branches off `develop`, implement logic strictly according to the architectural documents, write tests, and submit PRs for peer review.

---

## 10. Project Status

This repository strictly follows a documentation-first methodology. Currently, all foundational architecture, system design, database schemas, API contracts, and implementation roadmaps are completed and stored in the `/docs` directory. Active code implementation follows these approved blueprints.

---

## 11. Future Roadmap

While the current MVP focuses on core document storage and readiness assessments, the future roadmap includes:

- **Mobile Application:** Native iOS and Android clients for easier document scanning.
- **Multi-Language Support:** Localized interfaces and cross-lingual AI document extraction.
- **Government Integrations:** Direct API integrations to verify documents natively with issuing authorities.
- **Digital Identity Verification:** Advanced biometric cross-referencing.
- **Family Collaboration Enhancements:** Multi-user access with granular permissions and advisor roles.
- **Additional AI Capabilities:** Agentic workflows to auto-fill government forms using vault data.

---

## 12. Contributing

Contributions must follow the established [Git Workflow](docs/09_Git_Workflow.md). 
All new features require an architecture review and an update to the corresponding documentation before Pull Requests are merged. Unit tests and strict TypeScript typing are mandatory.

---

## 13. License

[License to be added before public release.]

---

## 14. Acknowledgements

FamilyOS AI is proudly built upon the foundations of:
- **Next.js** for the highly performant frontend.
- **NestJS** for the robust backend architecture.
- **Prisma** for type-safe database access.
- **OpenAI** for powerful generative and extraction intelligence.
- **Cloudinary** for secure, optimized media storage.
- **Neon PostgreSQL** for scalable, serverless relational data.
