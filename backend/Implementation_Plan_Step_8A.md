# Implementation Plan - Step 8A: Family Domain Foundation

## 1. Documentation Reviewed

The following sources of truth were reviewed to construct this plan:
1. **Project Blueprint** (`docs/project-blueprint.md`)
2. **Product Requirements Document (PRD)** (`docs/02_PRD.md`)
3. **System Architecture** (`docs/03_System_Architecture.md`)
4. **Database Design** (`docs/04_Database_Design.md`)
5. **API Specification** (`docs/05_API_Specification.md`)
6. **Backend Architecture** (`docs/06_Backend_Architecture.md`)
7. **TDD Development Guide** (`docs/16_TDD_Development_Guide.md`)
8. **Approved Execution Report - Step 7** (`Execution_Report_Step_7.md`)

---

## 2. Architecture Compliance

- **Repository Pattern**:
  - `FamilyRepository` will be the exclusive layer executing database queries via `PrismaService`. It will expose only generic data-access methods (`findById`, `findMany`, `findFirst`, `create`, `update`, `softDelete`) and will not include business-specific methods like querying by owner user ID directly. No business validation or domain calculations will reside in this layer.
- **Service Layer Responsibility**:
  - `FamilyService` encapsulates the business rules (active/archived state validation, validation transformations). It will access the database only through `FamilyRepository`. It is responsible for filtering out soft-deleted entities and enforcing business decisions.
- **Pure Domain Foundation**:
  - **No Controllers**: No HTTP routers or controllers are introduced.
  - **No Security/Guards**: No security checks, `FamilyRoleGuard`, or workspace ownership logic is applied.
  - **Soft Delete Pattern**: Relies on logical soft deletion by setting `deletedAt` to the current timestamp instead of running raw database `delete` queries. Soft delete must rely exclusively on the existing `deletedAt` field without modifying or assuming a status field value (e.g., `status = 'deleted'`). Active query filtering for deleted records is the responsibility of the service layer (`FamilyService`).

---

## 3. Objective

Create the data access and business service layers for the `Family` workspace entity, including interfaces, DTOs, validations, repositories, and unit tests, establishing a robust foundation for family-related features.

---

## 4. Scope

- **Family Interfaces**: Establish TypeScript interfaces for database attributes and input definitions.
- **Data Transfer Objects (DTOs)**:
  - `CreateFamilyDto` for validating workspace name input.
  - `UpdateFamilyDto` for validating workspace modification parameters.
  - `FamilyResponseDto` for output filtering.
- **Persistence Layer (`FamilyRepository`)**: Implements generic CRUD functions (`create`, `findById`, `findMany`, `findFirst`, `update`, `softDelete`).
- **Domain Service Layer (`FamilyService`)**: Implements the business orchestration logic, including filtering of soft-deleted entities.
- **Dependency Registration**: Declare providers inside the existing `FamilyModule` (to be modified in this step) and export the repository/service for future consumption.
- **Test Coverage**: Write comprehensive unit tests for `FamilyRepository` and `FamilyService`.

---

## 5. Out of Scope

- Family REST controllers/endpoints (to be implemented in Step 8B).
- Family Members, Member Invitations, and Member Roles (Step 9).
- Ownership authorization guards or filters.
- Documents, OCR, AI, Notification, or Dashboard features.

---

## 6. Files To Create

1. **[NEW]** `src/family/interfaces/family.interface.ts`
   - Defines database mappings:
     ```typescript
     export interface FamilyAttributes {
       id: string;
       ownerUserId: string;
       name: string;
       createdAt: Date;
       updatedAt: Date;
       deletedAt: Date | null;
     }

     export interface FamilyCreateInput {
       ownerUserId: string;
       name: string;
     }

     export interface FamilyUpdateInput {
       name?: string;
       deletedAt?: Date | null;
     }
     ```
     *(Note: Although the `status` field exists in the Prisma schema as a `String`, it has been excluded from the application layer interfaces and business logic in this plan to avoid assuming string status values and to rely exclusively on `deletedAt` for soft delete/lifecycle management).*
2. **[NEW]** `src/family/dto/create-family.dto.ts`
   - Input payload validator for workspace creation:
     ```typescript
     import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
     export class CreateFamilyDto {
       @IsString()
       @IsNotEmpty()
       @MaxLength(100)
       name: string;
     }
     ```
3. **[NEW]** `src/family/dto/update-family.dto.ts`
   - Input payload validator for updates:
     ```typescript
     import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
     export class UpdateFamilyDto {
       @IsString()
       @IsNotEmpty()
       @IsOptional()
       @MaxLength(100)
       name?: string;
     }
     ```
4. **[NEW]** `src/family/dto/family-response.dto.ts`
   - Standard output DTO:
     ```typescript
     export class FamilyResponseDto {
       id: string;
       ownerUserId: string;
       name: string;
       createdAt: Date;
       updatedAt: Date;
     }
     ```
5. **[NEW]** `src/family/family.repository.ts`
   - Data access layer utilizing `PrismaService` returning raw persistence results (no soft delete filtering inside the repository):
     - `create(data: Prisma.FamilyCreateInput): Promise<Family>`
     - `findById(id: string): Promise<Family | null>`
     - `findMany(params: { skip?: number; take?: number; where?: Prisma.FamilyWhereInput; orderBy?: Prisma.FamilyOrderByWithRelationInput }): Promise<Family[]>`
     - `findFirst(params: { where?: Prisma.FamilyWhereInput }): Promise<Family | null>`
     - `update(id: string, data: Prisma.FamilyUpdateInput): Promise<Family>`
     - `softDelete(id: string): Promise<Family>`
6. **[NEW]** `src/family/family.service.ts`
   - Orchestrator containing core business operations and enforcing soft-delete filtering:
     - `createFamily(ownerUserId: string, name: string): Promise<FamilyResponseDto>`
     - `getFamilyById(id: string): Promise<FamilyResponseDto>`
     - `getFamiliesByOwner(ownerUserId: string): Promise<FamilyResponseDto[]>`
     - `updateFamily(id: string, updateFamilyDto: UpdateFamilyDto): Promise<FamilyResponseDto>`
     - `deleteFamily(id: string): Promise<void>`
7. **[NEW]** `src/family/specs/family.service.spec.ts`
   - Unit tests mock the repository to test service method logic, soft-delete filtering, and edge cases.
8. **[NEW]** `src/family/specs/family.repository.spec.ts`
   - Unit tests verify repository method query mappings to Prisma and ensure raw persistence results are returned.

---

## 7. Files To Modify

1. **[MODIFY]** `src/family/family.module.ts`
   - Clarification: The module file already exists in the workspace. It will be **modified** in this step to declare and export `FamilyRepository` and `FamilyService` as module providers.

---

## 8. Dependencies To Add

- None.

---

## 9. Configuration Changes

- None.

---

## 10. Environment Changes

- None.

---

## 11. Database Impact

- Relies on database indexes on `families.ownerUserId` (which are already defined in PostgreSQL / Prisma schema) to ensure rapid query resolution. All deletes are soft delete operations, updating `deletedAt` to the current timestamp without removing relational data rows.
- **Database Schema**: The implementation will use the existing approved Prisma schema without modification. No schema fields will be introduced or redefined.

---

## 12. API Impact

- No API controllers or endpoints are introduced in this step.

---

## 13. Testing Strategy

### Unit Testing (`src/family/specs/family.service.spec.ts`)
- **createFamily**: Verify that the family is successfully created and returns a mapped `FamilyResponseDto`.
- **getFamilyById**: Assert it throws `NotFoundException` if family does not exist or has been soft-deleted (`deletedAt !== null`).
- **getFamiliesByOwner**: Verify list querying (using `findMany` with `{ ownerUserId, deletedAt: null }`) and response mapping.
- **updateFamily**: Assert update propagation and check that it throws `NotFoundException` if family is soft-deleted.
- **deleteFamily**: Assert it triggers repository `softDelete` and handles not found states.

### Repository Testing (`src/family/specs/family.repository.spec.ts`)
- Mock Prisma Service calls to verify that:
  - `findById` returns the raw database record (including when `deletedAt` is not null).
  - `findMany` returns the raw database list based on parameters passed (e.g. where filters) without automatic soft-delete filtering.
  - `softDelete` calls `prisma.family.update` setting the `deletedAt` field to a timestamp without modifying the `status` field.

---

## 14. Risks

- **Prisma Client Typing**: Ensure that the database entity mappings handle dates (`createdAt`, `updatedAt`, `deletedAt`) correctly.
  - *Mitigation*: Establish strict attributes interfaces and map them explicitly in the repository layer.

---

## 15. Assumptions

- **Soft Delete Compliance**: All downstream entities (FamilyMember, Document) will be physically/logically bounded to the `Family` id. When a family is soft-deleted, their children are considered inaccessible.

---

## 16. Open Questions

- None.

---

## 17. Implementation Sequence

### Phase 1: Core Definitions & Module setup
1. Create `src/family/interfaces/family.interface.ts`.
2. Create DTOs: `CreateFamilyDto`, `UpdateFamilyDto`, `FamilyResponseDto`.
3. Modify `src/family/family.module.ts` to wire providers.

### Phase 2: Persistence Layer
1. Create `src/family/family.repository.ts` with direct Prisma query methods.
2. Implement repository unit tests in `src/family/specs/family.repository.spec.ts`.

### Phase 3: Service Layer Orchestration
1. Create `src/family/family.service.ts` implementing create, retrieve, update, and soft delete methods.
2. Implement service unit tests in `src/family/specs/family.service.spec.ts`.
