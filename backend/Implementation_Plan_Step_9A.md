# Implementation Plan - Step 9A: Family Membership Domain

## 1. Documentation Reviewed

The following sources of truth were reviewed to construct this plan:
1. **Project Blueprint** (`docs/project-blueprint.md`)
2. **Product Requirements Document (PRD)** (`docs/02_PRD.md`)
3. **System Architecture** (`docs/03_System_Architecture.md`)
4. **Database Design** (`docs/04_Database_Design.md`)
5. **API Specification** (`docs/05_API_Specification.md`)
6. **Backend Architecture** (`docs/06_Backend_Architecture.md`)
7. **TDD Development Guide** (`docs/16_TDD_Development_Guide.md`)
8. **Git Workflow** (`docs/09_Git_Workflow.md`)
9. **Approved Implementation Plan - Step 8B** (`Implementation_Plan_Step_8B.md`)
10. **Approved Execution Report - Step 8B** (`Execution_Report_Step_8B.md`)

---

## 2. Architecture Compliance

- **Decoupled Service Logic**:
  - To prevent cross-domain service coupling, `FamilyMemberService` will *not* depend directly on `FamilyService`. Instead, to verify the existence of the parent family workspace, it will inject and use the `FamilyRepository` abstraction directly (`familyRepository.findById(familyId)`).
- **Repository Dependency Registration**:
  - `FamilyRepository` is exported from `FamilyModule`.
  - `FamilyMemberModule` imports `FamilyModule`, which makes the exported `FamilyRepository` available as an injectable provider dependency in the `FamilyMemberModule` context.
- **Module Organization Justification**:
  - According to the approved backend architecture (`docs/06_Backend_Architecture.md`, Section 7 Module Breakdown), the `Family Member Module` is specified as a distinct logical module from the `Family Module` (`FamilyModule --> FamilyMemberModule`). Therefore, we are introducing a new module `FamilyMemberModule` (to be registered in `AppModule`) rather than extending `FamilyModule` with member-specific logic.
- **Repository Pattern**:
  - `FamilyMemberRepository` will be the exclusive layer executing database queries for the `FamilyMember` model via `PrismaService`. It will expose generic data-access methods (`create`, `findById`, `findMany`, `findFirst`, `update`, `softDelete`) and will return raw persistence results without business decisions.
- **Service Layer Responsibility**:
  - `FamilyMemberService` encapsulates business logic rules (active/archived state checking, validation, parent family verification, and soft-delete filtering).
- **Soft Delete Pattern**:
  - Relies on logical soft deletion by setting `deletedAt` to the current timestamp. Soft delete relies exclusively on the existing `deletedAt` field without modifying or assuming a status field value (e.g. `status = 'deleted'`). Active query filtering for deleted records is the responsibility of the service layer (`FamilyMemberService`).
- **Prisma Client Compatibility & Type Reuse**:
  - To avoid duplicating persistence models with redundant TypeScript interfaces, the implementation will directly leverage the generated Prisma types: `FamilyMember` (attributes), `Prisma.FamilyMemberUncheckedCreateInput` (creation payload), and `Prisma.FamilyMemberUncheckedUpdateInput` (update payload).
- **Database Schema**:
  - The implementation uses the existing approved Prisma schema without modification. No fields will be introduced or redefined.
- **Status Field Contract Justification**:
  - **Write Operations (Create/Update DTOs)**: The `status` field is removed from `CreateFamilyMemberDto` and `UpdateFamilyMemberDto` as the API specification does not require clients to read/write this field during member creation or modifications.
  - **Read Operations (Response DTO)**: The `status` field is retained in `FamilyMemberResponseDto` because the API specification (e.g., List Members response) returns `"status": "active"`.
  - **Database Persistence**: To satisfy the required `status` field in the Prisma schema without assuming complex business semantics, the `FamilyMemberService` will automatically set the `status` field to the standard string `"active"` when creating a new member database record, utilizing the existing schema fields as-is without introducing custom statuses or lifecycle states in this milestone.

---

## 3. User Review Required

> [!IMPORTANT]
> **Documentation Conflict Reported:**
> There is a conflict between the approved roadmap / Step 9 scope (which requires a Family-scoped RBAC foundation and role assignments for members) and the approved Prisma database schema (`backend/prisma/schema.prisma`), which contains no `role` field on the `FamilyMember` model, nor any other membership/RBAC role tables. 
> 
> In compliance with the instruction to use the existing approved Prisma schema without modification, we are flagging this conflict. We cannot implement database-persisted roles without modifying the schema. As a resolution, we propose to:
> 1. Keep the database operations aligned strictly with the current unmodified schema fields (`fullName`, `relationship`, `dateOfBirth`, `primaryEmail`, `primaryPhone`, `status`, `deletedAt`).
> 2. Exclude database role storage from this step. Any role-related DTO definitions or logic will be deferred until a database schema migration for RBAC tables is formally approved.

---

## 4. Objective

Create the data access and business service layers for the `FamilyMember` entity, utilizing the existing Prisma schema, implementing validations, repositories, and unit tests, and establishing a robust domain foundation for family memberships.

---

## 5. Scope

- **Data Transfer Objects (DTOs)**:
  - `CreateFamilyMemberDto` to validate and map new membership details.
  - `UpdateFamilyMemberDto` to validate update parameters.
  - `FamilyMemberResponseDto` to format output mappings.
- **Persistence Layer (`FamilyMemberRepository`)**: Generic CRUD methods utilizing Prisma client types directly.
- **Domain Service Layer (`FamilyMemberService`)**: Business orchestration, parent workspace presence check (via `FamilyRepository`), and soft-delete filtering.
- **Dependency Registration**: Register providers inside `FamilyMemberModule` and import it in `AppModule`.
- **Testing**: Write comprehensive unit tests for `FamilyMemberRepository` and `FamilyMemberService`.

---

## 6. Out of Scope

- REST APIs (deferred to Step 9B).
- Invitations and Invitation acceptance flows (deferred to Step 9B/9C).
- Fine-grained workspace ownership validation guard (`FamilyOwnershipGuard`) or dynamic role checks.
- Documents, OCR, AI, Notification, or Dashboard features.

---

## 7. Files To Create

1. **[NEW]** `src/family-member/dto/create-family-member.dto.ts`
   - Validates create payload (excludes `status` as it is not part of the write API contract):
     ```typescript
     import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDate, MaxLength } from 'class-validator';
     import { Type } from 'class-transformer';

     export class CreateFamilyMemberDto {
       @IsString()
       @IsNotEmpty()
       @MaxLength(100)
       fullName: string;

       @IsString()
       @IsOptional()
       @MaxLength(50)
       relationship?: string;

       @IsDate()
       @IsOptional()
       @Type(() => Date)
       dateOfBirth?: Date;

       @IsEmail()
       @IsOptional()
       primaryEmail?: string;

       @IsString()
       @IsOptional()
       @MaxLength(20)
       primaryPhone?: string;
     }
     ```
2. **[NEW]** `src/family-member/dto/update-family-member.dto.ts`
   - Validates update payload (excludes `status` as it is not part of the write API contract):
     ```typescript
     import { IsString, IsOptional, IsEmail, IsDate, MaxLength, IsNotEmpty } from 'class-validator';
     import { Type } from 'class-transformer';

     export class UpdateFamilyMemberDto {
       @IsString()
       @IsNotEmpty()
       @IsOptional()
       @MaxLength(100)
       fullName?: string;

       @IsString()
       @IsOptional()
       @MaxLength(50)
       relationship?: string;

       @IsDate()
       @IsOptional()
       @Type(() => Date)
       dateOfBirth?: Date;

       @IsEmail()
       @IsOptional()
       primaryEmail?: string;

       @IsString()
       @IsOptional()
       @MaxLength(20)
       primaryPhone?: string;
     }
     ```
3. **[NEW]** `src/family-member/dto/family-member-response.dto.ts`
   - Standard output DTO matching schema fields and exposing `status` as defined in the API Spec read contract:
     ```typescript
     export class FamilyMemberResponseDto {
       id: string;
       familyId: string;
       fullName: string;
       relationship: string | null;
       dateOfBirth: Date | null;
       primaryEmail: string | null;
       primaryPhone: string | null;
       status: string;
       createdAt: Date;
       updatedAt: Date;
     }
     ```
4. **[NEW]** `src/family-member/family-member.repository.ts`
   - Data access layer utilizing `PrismaService` returning raw persistence results (no custom interface, uses `@prisma/client` types directly):
     - `create(data: Prisma.FamilyMemberUncheckedCreateInput): Promise<FamilyMember>`
     - `findById(id: string): Promise<FamilyMember | null>`
     - `findMany(params: { skip?: number; take?: number; where?: Prisma.FamilyMemberWhereInput; orderBy?: Prisma.FamilyMemberOrderByWithRelationInput }): Promise<FamilyMember[]>`
     - `findFirst(params: { where?: Prisma.FamilyMemberWhereInput }): Promise<FamilyMember | null>`
     - `update(id: string, data: Prisma.FamilyMemberUncheckedUpdateInput): Promise<FamilyMember>`
     - `softDelete(id: string): Promise<FamilyMember>`
5. **[NEW]** `src/family-member/family-member.service.ts`
   - Orchestrator containing core business operations, soft-delete filtering, and parent workspace check (injecting `FamilyRepository` directly):
     - `createMember(familyId: string, createFamilyMemberDto: CreateFamilyMemberDto): Promise<FamilyMemberResponseDto>`
     - `getMemberById(id: string): Promise<FamilyMemberResponseDto>`
     - `getMembersByFamily(familyId: string): Promise<FamilyMemberResponseDto[]>`
     - `updateMember(id: string, updateFamilyMemberDto: UpdateFamilyMemberDto): Promise<FamilyMemberResponseDto>`
     - `deleteMember(id: string): Promise<void>`
6. **[NEW]** `src/family-member/family-member.module.ts`
   - New NestJS module imports `FamilyModule` (making the exported `FamilyRepository` available as a provider dependency) and registers `FamilyMemberService` and `FamilyMemberRepository`.
     ```typescript
     import { Module } from '@nestjs/common';
     import { FamilyMemberService } from './family-member.service';
     import { FamilyMemberRepository } from './family-member.repository';
     import { FamilyModule } from '../family/family.module';

     @Module({
       imports: [FamilyModule],
       providers: [FamilyMemberService, FamilyMemberRepository],
       exports: [FamilyMemberService, FamilyMemberRepository],
     })
     export class FamilyMemberModule {}
     ```
7. **[NEW]** `src/family-member/specs/family-member.repository.spec.ts`
   - Unit tests to verify generic Prisma mappings and soft-delete parameters.
8. **[NEW]** `src/family-member/specs/family-member.service.spec.ts`
   - Unit tests mocking repositories to verify business rules, soft-delete filtering, and parent workspace validation (via `FamilyRepository` mock).

---

## 8. Files To Modify

1. **[MODIFY]** `src/app.module.ts`
   - Register `FamilyMemberModule` in the root imports array.

---

## 9. Dependencies

- None.

---

## 10. Configuration Changes

- None.

---

## 11. Environment Changes

- None.

---

## 12. Database Impact

- Relies on database indexes on `family_members.familyId` (already defined in PostgreSQL / Prisma schema) to ensure rapid query resolution. All deletes are soft delete operations, updating `deletedAt` without removing relational data rows.
- **Database Schema**: The implementation uses the existing approved Prisma schema without modification.

---

## 13. API Impact

- No API controllers or endpoints are introduced in this step.

---

## 14. Testing Strategy

### Unit Testing (`src/family-member/specs/family-member.service.spec.ts`)
- **createMember**: Verify that it throws `NotFoundException` if the associated family doesn't exist or is soft-deleted (calling `familyRepository.findById`), and creates the member successfully otherwise.
- **getMemberById**: Verify that it throws `NotFoundException` if the member does not exist or has been soft-deleted (`deletedAt !== null`).
- **getMembersByFamily**: Verify that it throws `NotFoundException` if the family doesn't exist or is soft-deleted (calling `familyRepository.findById`), and queries active members using generic repository parameters otherwise.
- **updateMember**: Verify that it throws `NotFoundException` if the member is soft-deleted, and updates via repository otherwise.
- **deleteMember**: Verify that it throws `NotFoundException` if the member is already soft-deleted, and calls repository `softDelete` otherwise.

### Repository Testing (`src/family-member/specs/family-member.repository.spec.ts`)
- Mock Prisma Service calls to verify that:
  - `findById` returns the raw database record (including when `deletedAt` is set).
  - `findMany` queries the database based on parameter conditions without automatic soft-delete filtering.
  - `softDelete` calls `prisma.familyMember.update` setting the `deletedAt` field to a timestamp without modifying the `status` field.

---

## 15. Risks

- **Module Dependency Cycles**: Circular dependencies between `FamilyModule` and `FamilyMemberModule` could crash compilation.
  - *Mitigation*: Ensure `FamilyMemberModule` imports `FamilyModule`, but `FamilyModule` does *not* import `FamilyMemberModule`. This matches the hierarchical domain architecture.

---

## 16. Assumptions

- **Soft Delete Compliance**: When a family member is soft-deleted, their documents (relational downstream entities) will also be treated as inaccessible.
- **Standard Global Pipes**: Reuses global `ValidationPipe` for date conversions and class-validator parsing in integration scopes.

---

## 17. Open Questions

- None.

---

## 18. Implementation Sequence

### Phase 1: Core Definitions & Module Setup
1. Create DTOs: `CreateFamilyMemberDto`, `UpdateFamilyMemberDto`, `FamilyMemberResponseDto`.
2. Create `src/family-member/family-member.module.ts`.
3. Modify `src/app.module.ts` to register `FamilyMemberModule`.

### Phase 2: Persistence Layer
1. Create `src/family-member/family-member.repository.ts`.
2. Implement repository tests in `src/family-member/specs/family-member.repository.spec.ts`.

### Phase 3: Service Layer Orchestration
1. Create `src/family-member/family-member.service.ts`.
2. Implement service tests in `src/family-member/specs/family-member.service.spec.ts`.
