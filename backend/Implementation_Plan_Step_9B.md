# Implementation Plan - Step 9B: Family Membership REST APIs

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
9. **Approved Implementation Plan - Step 9A** (`Implementation_Plan_Step_9A.md`)
10. **Approved Execution Report - Step 9A** (`Execution_Report_Step_9A.md`)

---

## 2. Architecture Compliance

- **Controller-Service Delegation**:
  - `FamilyMemberController` delegates all actions to `FamilyMemberService`. It contains no direct Prisma queries or business validation logic.
- **Parent Resource Consistency**:
  - To validate the resource hierarchy (ensuring the member profile belongs to the specified family workspace), the service layer signatures are updated to accept both `familyId` and `memberId` contexts. The service evaluates that `member.familyId === familyId` before executing gets, updates, or deletes.
- **Security & Authorization Protection**:
  - Protected globally at the class level via `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth('access-token')`.
- **Transitive Authentication Resolution**:
  - In compliance with the requirements, `FamilyMemberModule` does not import `AuthModule` directly in its metadata. The existing NestJS application architecture resolves `JwtAuthGuard` dependencies dynamically.
- **Response Format & HTTP Codes**:
  - Controllers return DTOs directly without manual wrapper formats.
  - Successful `DELETE` operations will return no response body and use the standard `204 No Content` status code.
- **Validation Pipe**:
  - Leverages the existing global `ValidationPipe` registered in `main.ts` for all class-validator DTOs, without introducing new validation infrastructure.
- **Schema & DTO Integrity**:
  - The implementation reuses the existing Prisma schema and existing DTOs (`CreateFamilyMemberDto`, `UpdateFamilyMemberDto`, `FamilyMemberResponseDto`) created in Step 9A without modification or redefinition.
- **No Authorization / RBAC Enforcement**:
  - No fine-grained workspace ownership validation guard (`FamilyOwnershipGuard`) or dynamic role checks are implemented in this REST API step (explicitly excluded).

---

## 3. Objective

Expose the REST API controllers and endpoints for the `FamilyMember` workspace sub-domain, implementing payload validation, Swagger documentation, and thorough unit/E2E test verification.

---

## 4. Scope

- **Endpoints**:
  - `POST /api/v1/families/:familyId/members`: Adds a member to the family workspace.
  - `GET /api/v1/families/:familyId/members`: Lists active members in the family workspace.
  - `GET /api/v1/families/:familyId/members/:memberId`: Retrieves specific member details by ID.
  - `PATCH /api/v1/families/:familyId/members/:memberId`: Updates family member details.
  - `DELETE /api/v1/families/:familyId/members/:memberId`: Soft deletes a family member.
- **Request Validation**: Reuses the existing global `ValidationPipe` for DTO payload validation.
- **Swagger Documentation**: Document all request types, response payloads, status codes, and authorization requirements using NestJS Swagger decorators (specifically mapping `DELETE` to 204).
- **Dependency Registration**: Register `FamilyMemberController` inside `FamilyMemberModule`.
- **Tests**: Plan controller unit tests (overriding `JwtAuthGuard`) and E2E integration tests covering CRUD operations, validation failures, authentication checks, and 404 responses.

---

## 5. Out of Scope

- Invitations and Invitation acceptance flows (deferred to Step 9C).
- Custom database-driven family ownership guards (`FamilyOwnershipGuard`) or dynamic role check mechanisms (explicitly excluded).
- Documents, OCR, AI, Notification, or Dashboard features.

---

## 6. Files To Create

1. **[NEW]** `src/family-member/family-member.controller.ts`
   - Exposes REST endpoints, configures security guards, handles request parameters, and binds Swagger documentation:
     ```typescript
     import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
     import { FamilyMemberService } from './family-member.service';
     import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
     import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
     import { FamilyMemberResponseDto } from './dto/family-member-response.dto';
     import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
     import {
       ApiTags,
       ApiOperation,
       ApiBearerAuth,
       ApiCreatedResponse,
       ApiOkResponse,
       ApiBadRequestResponse,
       ApiNotFoundResponse,
       ApiUnauthorizedResponse,
       ApiResponse,
     } from '@nestjs/swagger';

     @ApiTags('Family Members')
     @ApiBearerAuth('access-token')
     @UseGuards(JwtAuthGuard)
     @Controller('v1/families/:familyId/members')
     export class FamilyMemberController {
       constructor(private readonly familyMemberService: FamilyMemberService) {}

       @Post()
       @HttpCode(HttpStatus.CREATED)
       @ApiOperation({ summary: 'Add a member to the family workspace' })
       @ApiCreatedResponse({ description: 'Family member successfully created.', type: FamilyMemberResponseDto })
       @ApiBadRequestResponse({ description: 'Invalid input data.' })
       @ApiNotFoundResponse({ description: 'Family workspace not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async create(
         @Param('familyId') familyId: string,
         @Body() createFamilyMemberDto: CreateFamilyMemberDto,
       ): Promise<FamilyMemberResponseDto> {
         return this.familyMemberService.createMember(familyId, createFamilyMemberDto);
       }

       @Get()
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'List all active members in the family workspace' })
       @ApiOkResponse({ description: 'Active members list retrieved successfully.', type: [FamilyMemberResponseDto] })
       @ApiNotFoundResponse({ description: 'Family workspace not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async findAll(@Param('familyId') familyId: string): Promise<FamilyMemberResponseDto[]> {
         return this.familyMemberService.getMembersByFamily(familyId);
       }

       @Get(':memberId')
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'Retrieve specific member details' })
       @ApiOkResponse({ description: 'Family member details retrieved successfully.', type: FamilyMemberResponseDto })
       @ApiNotFoundResponse({ description: 'Family member not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async findOne(
         @Param('familyId') familyId: string,
         @Param('memberId') memberId: string,
       ): Promise<FamilyMemberResponseDto> {
         return this.familyMemberService.getMemberById(familyId, memberId);
       }

       @Patch(':memberId')
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'Update family member details' })
       @ApiOkResponse({ description: 'Family member successfully updated.', type: FamilyMemberResponseDto })
       @ApiBadRequestResponse({ description: 'Invalid input data.' })
       @ApiNotFoundResponse({ description: 'Family member not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async update(
         @Param('familyId') familyId: string,
         @Param('memberId') memberId: string,
         @Body() updateFamilyMemberDto: UpdateFamilyMemberDto,
       ): Promise<FamilyMemberResponseDto> {
         return this.familyMemberService.updateMember(familyId, memberId, updateFamilyMemberDto);
       }

       @Delete(':memberId')
       @HttpCode(HttpStatus.NO_CONTENT)
       @ApiOperation({ summary: 'Soft delete a family member' })
       @ApiResponse({ status: 204, description: 'Family member successfully soft-deleted.' })
       @ApiNotFoundResponse({ description: 'Family member not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async remove(
         @Param('familyId') familyId: string,
         @Param('memberId') memberId: string,
       ): Promise<void> {
         await this.familyMemberService.deleteMember(familyId, memberId);
       }
     }
     ```
2. **[NEW]** `src/family-member/specs/family-member.controller.spec.ts`
   - Unit tests to verify that `FamilyMemberController` correctly forwards operations to `FamilyMemberService` and returns the expected DTO structures. Disables `JwtAuthGuard` to focus testing purely on controller route delegation:
     - `create`: Resolves parameters and returns `FamilyMemberResponseDto`.
     - `findAll`: Calls `getMembersByFamily` and returns `FamilyMemberResponseDto[]`.
     - `findOne`: Calls `getMemberById` with both family and member ID parameters.
     - `update`: Calls `updateMember` with family, member, and DTO parameters.
     - `remove`: Calls `deleteMember` with family and member ID parameters.
3. **[NEW]** `tests/e2e/family-member.e2e-spec.ts`
   - End-to-end integration tests using `supertest` to test route integrity and validation pipelines:
     - Authentication protection (401 Unauthorized when Bearer token is missing).
     - Success paths: Create Member -> List Members -> Get Member Details -> Update Details -> Soft Delete (returns 204).
     - Validation checks (400 Bad Request on invalid body formats).
     - Non-existent parents/members (404 Not Found on invalid familyId or memberId, and after soft deletion).

---

## 7. Files To Modify

1. **[MODIFY]** `src/family-member/family-member.service.ts`
   - Update method signatures to support parent workspace validation checks (`familyId` parameter checks):
     - `getMemberById(familyId: string, id: string): Promise<FamilyMemberResponseDto>`
       - Verifies `member.familyId === familyId`, throwing a `NotFoundException` on mismatch.
     - `updateMember(familyId: string, id: string, dto: UpdateFamilyMemberDto): Promise<FamilyMemberResponseDto>`
       - Calls updated `getMemberById` to perform hierarchy check prior to repository update.
     - `deleteMember(familyId: string, id: string): Promise<void>`
       - Calls updated `getMemberById` to perform hierarchy check prior to repository delete.
2. **[MODIFY]** `src/family-member/family-member.module.ts`
   - Register `FamilyMemberController` inside the module controllers (without importing `AuthModule` in metadata).
     ```typescript
     import { Module } from '@nestjs/common';
     import { FamilyMemberService } from './family-member.service';
     import { FamilyMemberRepository } from './family-member.repository';
     import { FamilyMemberController } from './family-member.controller';
     import { FamilyModule } from '../family/family.module';

     @Module({
       imports: [FamilyModule],
       controllers: [FamilyMemberController],
       providers: [FamilyMemberService, FamilyMemberRepository],
       exports: [FamilyMemberService, FamilyMemberRepository],
     })
     export class FamilyMemberModule {}
     ```

---

## 8. Dependencies

- None.

---

## 9. Configuration Changes

- None.

---

## 10. Environment Changes

- None.

---

## 11. Database Impact

- Relies on queries routed through PostgreSQL indices on `family_members.familyId`. The E2E tests will run database cleaning operations on test setup/teardown.
- **Database Schema**: No changes are introduced to the database schema.

---

## 12. API Impact

- Exposes five REST API endpoints versioned under `/api/v1/families/:familyId/members`:
  - `POST /api/v1/families/:familyId/members`
  - `GET /api/v1/families/:familyId/members`
  - `GET /api/v1/families/:familyId/members/:memberId`
  - `PATCH /api/v1/families/:familyId/members/:memberId`
  - `DELETE /api/v1/families/:familyId/members/:memberId` (returns HTTP 204)
- Incorporates Swagger API schema descriptions available at `/api/docs`.

---

## 13. Testing Strategy

### Unit Testing (`src/family-member/specs/family-member.controller.spec.ts`)
- Mocks `FamilyMemberService`.
- Disables/overrides `JwtAuthGuard` within the Nest testing module compile step (`.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })`), focusing test suite purely on delegation logic.
- Assertions:
  - Verify parameter forwarding (familyId, memberId, DTO bodies) to service methods.
  - Verify that methods return DTOs directly without wrapping.

### Integration Testing (`tests/e2e/family-member.e2e-spec.ts`)
- Sets up an authenticated context using the token service helper to obtain a Bearer token.
- Seeds test User and Family records in `beforeAll` to satisfy foreign keys, cleaning them up in `afterAll`.
- **POST /api/v1/families/:familyId/members**:
  - Verified with valid payloads (should return 201).
  - Verified with empty or invalid fullName payloads (should return 400).
  - Verified with nonexistent `familyId` (should return 404).
- **GET /api/v1/families/:familyId/members**:
  - Verified that listing returned contains the created member.
  - Verified with nonexistent `familyId` (should return 404).
- **GET /api/v1/families/:familyId/members/:memberId**:
  - Validates successful retrieval (should return 200).
  - Validates nonexistent member ID or incorrect hierarchy (should return 404).
- **PATCH /api/v1/families/:familyId/members/:memberId**:
  - Validates successful name/relationship updates (should return 200).
  - Validates validation errors on invalid payloads.
  - Validates incorrect hierarchy (should return 404).
- **DELETE /api/v1/families/:familyId/members/:memberId**:
  - Validates successful soft delete (should return 204).
  - Validates that subsequent retrieval / update calls return 404.

---

## 14. Risks

- **Test Isolation**: Inter-test DB state persistence could leak between runs.
  - *Mitigation*: Add cleanup operations in the E2E `afterAll` hook to clean up all test members, families, and users created during E2E assertions by matching test identifiers.

---

## 15. Assumptions

- **JWT Availability**: The JWT structure remains consistent with the auth module parameters (including the `sub` claim mapping to `userId`).
- **Global Pipes & Filters**: NestJS will correctly run path/body validations using global `ValidationPipe` configurations defined in `main.ts`.

---

## 16. Open Questions

- None.

---

## 17. Implementation Sequence

### Phase 1: Service Signature refactoring
1. Modify `src/family-member/family-member.service.ts` to implement parent validation checks.
2. Update unit tests in `src/family-member/specs/family-member.service.spec.ts` to match the new signatures.

### Phase 2: Controller & Module wiring
1. Create `src/family-member/family-member.controller.ts` with core routes, Swagger annotations, and guards.
2. Modify `src/family-member/family-member.module.ts` to register the controller.

### Phase 3: Unit Testing
1. Create `src/family-member/specs/family-member.controller.spec.ts`.
2. Mock `FamilyMemberService` and override `JwtAuthGuard` to verify correct controller routing.

### Phase 4: Integration Testing
1. Create E2E test suites inside `tests/e2e/family-member.e2e-spec.ts`.
2. Implement user authentication, request validations, and verify full CRUD lifecycle scenarios.
