# Implementation Plan - Step 8B: Family REST APIs

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
9. **Approved Implementation Plan - Step 8A** (`Implementation_Plan_Step_8A.md`)
10. **Approved Execution Report - Step 8A** (`Execution_Report_Step_8A.md`)

---

## 2. Architecture Compliance

- **Controller-Service Delegation**:
  - `FamilyController` delegates all actions to `FamilyService`. It contains no database queries (Prisma client) or logic orchestration.
- **Security & Authorization Protection**:
  - Protected globally at the class level via `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth('access-token')`.
- **Response Format**:
  - Controllers return DTOs directly (`FamilyResponseDto` or `FamilyResponseDto[]`), without any manual `{ success, data }` wrapping, adhering to the standard return patterns of the existing project architecture (e.g. `AuthController`).
- **Decoupled Module Dependencies**:
  - `FamilyModule` remains decoupled from `AuthModule` and does not import `AuthModule` directly. Instead, `JwtAuthGuard` dependencies (such as `TokenService`) are resolved at the application level via the root `AppModule` (which imports both `AuthModule` and `FamilyModule` in parallel).
- **Validation Pipe**:
  - Leverages the existing global `ValidationPipe` registered in `main.ts` for all class-validator DTOs, without introducing new validation infrastructure.
- **Schema & DTO Integrity**:
  - The implementation reuses the existing Prisma schema and existing DTOs (`CreateFamilyDto`, `UpdateFamilyDto`, `FamilyResponseDto`) created in Step 8A without modification or redefinition.

---

## 3. Objective

Expose the REST API controllers and endpoints for the `Family` workspace domain, implementing payload validation, Swagger documentation, and thorough unit/E2E test verification.

---

## 4. Scope

- **Endpoints**:
  - `POST /api/v1/families`: Creates a new family workspace.
  - `GET /api/v1/families`: Lists families for the authenticated user context.
  - `GET /api/v1/families/:id`: Retrieves family workspace details by ID.
  - `PATCH /api/v1/families/:id`: Updates family workspace name/details.
  - `DELETE /api/v1/families/:id`: Soft deletes a family workspace.
- **Request Validation**: Reuses the existing global `ValidationPipe` for DTO payload validation.
- **Swagger Documentation**: Document all request types, response payloads, status codes, and authorization requirements using NestJS Swagger decorators.
- **Dependency Registration**: Register `FamilyController` inside `FamilyModule`.
- **Tests**: Plan controller unit tests and E2E integration tests covering CRUD operations, validation failures, authentication checks, and 404 responses.

---

## 5. Out of Scope

- Family Membership, Invitations, and Role assignments (deferred to Step 9).
- Custom database-driven family ownership guards (`FamilyOwnershipGuard`) or dynamic role check mechanisms (explicitly excluded).
- Documents, OCR, AI, Notification, or Dashboard features.

---

## 6. Files To Create

1. **[NEW]** `src/family/family.controller.ts`
   - Exposes REST endpoints, configures security guards, handles user context mapping, and binds Swagger documentation:
     ```typescript
     import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
     import { FamilyService } from './family.service';
     import { CreateFamilyDto } from './dto/create-family.dto';
     import { UpdateFamilyDto } from './dto/update-family.dto';
     import { FamilyResponseDto } from './dto/family-response.dto';
     import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
     import { CurrentUser } from '../auth/decorators/current-user.decorator';
     import { CurrentUser as CurrentUserInterface } from '../auth/interfaces/auth.interface';
     import {
       ApiTags,
       ApiOperation,
       ApiBearerAuth,
       ApiCreatedResponse,
       ApiOkResponse,
       ApiBadRequestResponse,
       ApiNotFoundResponse,
       ApiUnauthorizedResponse,
     } from '@nestjs/swagger';

     @ApiTags('Family')
     @ApiBearerAuth('access-token')
     @UseGuards(JwtAuthGuard)
     @Controller('v1/families')
     export class FamilyController {
       constructor(private readonly familyService: FamilyService) {}

       @Post()
       @HttpCode(HttpStatus.CREATED)
       @ApiOperation({ summary: 'Create a new family workspace' })
       @ApiCreatedResponse({ description: 'Family workspace successfully created.', type: FamilyResponseDto })
       @ApiBadRequestResponse({ description: 'Invalid input data.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async create(
         @Body() createFamilyDto: CreateFamilyDto,
         @CurrentUser() user: CurrentUserInterface,
       ): Promise<FamilyResponseDto> {
         return this.familyService.createFamily(user.userId, createFamilyDto.name);
       }

       @Get()
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'List all active families' })
       @ApiOkResponse({ description: 'Active families list retrieved successfully.', type: [FamilyResponseDto] })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async findAll(@CurrentUser() user: CurrentUserInterface): Promise<FamilyResponseDto[]> {
         return this.familyService.getFamiliesByOwner(user.userId);
       }

       @Get(':id')
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'Retrieve family workspace details' })
       @ApiOkResponse({ description: 'Family workspace details retrieved successfully.', type: FamilyResponseDto })
       @ApiNotFoundResponse({ description: 'Family workspace not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async findOne(@Param('id') id: string): Promise<FamilyResponseDto> {
         return this.familyService.getFamilyById(id);
       }

       @Patch(':id')
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'Update family workspace details' })
       @ApiOkResponse({ description: 'Family workspace successfully updated.', type: FamilyResponseDto })
       @ApiBadRequestResponse({ description: 'Invalid input data.' })
       @ApiNotFoundResponse({ description: 'Family workspace not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async update(
         @Param('id') id: string,
         @Body() updateFamilyDto: UpdateFamilyDto,
       ): Promise<FamilyResponseDto> {
         return this.familyService.updateFamily(id, updateFamilyDto);
       }

       @Delete(':id')
       @HttpCode(HttpStatus.OK)
       @ApiOperation({ summary: 'Soft delete a family workspace' })
       @ApiOkResponse({ description: 'Family workspace successfully soft-deleted.' })
       @ApiNotFoundResponse({ description: 'Family workspace not found.' })
       @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
       async remove(@Param('id') id: string): Promise<void> {
         await this.familyService.deleteFamily(id);
       }
     }
     ```
2. **[NEW]** `src/family/specs/family.controller.spec.ts`
   - Unit tests to verify that `FamilyController` correctly forwards operations to `FamilyService` and returns the expected DTO structures:
     - `create`: Resolves parameters and returns `FamilyResponseDto`.
     - `findAll`: Calls `getFamiliesByOwner` and returns `FamilyResponseDto[]`.
     - `findOne`: Calls `getFamilyById` with ID parameter.
     - `update`: Calls `updateFamily` with ID and DTO payload.
     - `remove`: Calls `deleteFamily` with ID.
3. **[NEW]** `tests/e2e/family.e2e-spec.ts`
   - End-to-end integration tests using `supertest` to test route integrity and validation pipelines:
     - Authentication protection (401 Unauthorized when Bearer token is missing).
     - Success paths: Create Family -> List Families -> Get Family Details -> Update Name -> Soft Delete.
     - Validation checks (400 Bad Request on invalid bodies).
     - Not found behavior (subsequent requests to deleted ID return 404).

---

## 7. Files To Modify

1. **[MODIFY]** `src/family/family.module.ts`
   - Register `FamilyController` inside `FamilyModule` controllers.
     ```typescript
     import { Module } from '@nestjs/common';
     import { FamilyService } from './family.service';
     import { FamilyRepository } from './family.repository';
     import { FamilyController } from './family.controller';

     @Module({
       controllers: [FamilyController],
       providers: [FamilyService, FamilyRepository],
       exports: [FamilyService, FamilyRepository],
     })
     export class FamilyModule {}
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

- Relies on queries routed through PostgreSQL indices on `families.ownerUserId`. The E2E tests will run database cleaning operations on test setup/teardown.
- **Database Schema**: No changes are introduced to the database schema.

---

## 12. API Impact

- Exposes five REST API endpoints versioned under `/api/v1/families`:
  - `POST /api/v1/families`
  - `GET /api/v1/families`
  - `GET /api/v1/families/:id`
  - `PATCH /api/v1/families/:id`
  - `DELETE /api/v1/families/:id`
- Incorporates Swagger API schema descriptions available at `/api/docs`.

---

## 13. Testing Strategy

### Unit Testing (`src/family/specs/family.controller.spec.ts`)
- Mocks `FamilyService`.
- Assertions:
  - Verify `@CurrentUser()` binds the request user context and passes `user.userId` to `create` and `findAll` operations.
  - Verify payload passing to update and delete methods.
  - Verify that methods return DTOs directly without wrapping.

### Integration Testing (`tests/e2e/family.e2e-spec.ts`)
- Sets up an authenticated context using the auth service helper to obtain a Bearer token.
- **POST /api/v1/families**:
  - Verified with valid payloads (should return 201).
  - Verified with empty or invalid name payloads (should return 400).
- **GET /api/v1/families**:
  - Verified that listing returned contains the created workspaces.
- **GET /api/v1/families/:id**:
  - Validates successful retrieval (should return 200).
  - Validates non-existent IDs (should return 404).
- **PATCH /api/v1/families/:id**:
  - Validates successful name updates (should return 200).
- **DELETE /api/v1/families/:id**:
  - Validates successful soft delete (should return 200).
  - Validates that subsequent retrieval / update calls return 404.

---

## 14. Risks

- **Test Isolation**: Inter-test DB state persistence could leak between runs.
  - *Mitigation*: Add cleanup operations in the E2E `afterAll` hook to clean up all test workspaces created during E2E assertions by matching test owner user IDs.

---

## 15. Assumptions

- **JWT Availability**: The JWT structure remains consistent with the auth module parameters (including the `sub` claim mapping to `userId`).
- **Global Pipes & Filters**: NestJS will correctly run path/body validations using global `ValidationPipe` configurations defined in `main.ts`.

---

## 16. Open Questions

- None.

---

## 17. Implementation Sequence

### Phase 1: Controller & Module wiring
1. Create `src/family/family.controller.ts` with core routes, Swagger annotations, and guards.
2. Modify `src/family/family.module.ts` to register the controller.

### Phase 2: Unit Testing
1. Create `src/family/specs/family.controller.spec.ts`.
2. Mock `FamilyService` to verify correct controller routing.

### Phase 3: Integration Testing
1. Create E2E test suites inside `tests/e2e/family.e2e-spec.ts`.
2. Implement user authentication, request validations, and verify full CRUD lifecycle scenarios.
