# Implementation Plan - Step 7: Authorization Infrastructure

## 1. Documentation Reviewed

The following sources of truth were reviewed to construct this plan:
1. **Project Blueprint** (`docs/project-blueprint.md`)
2. **Product Requirements Document (PRD)** (`docs/02_PRD.md`)
3. **System Architecture** (`docs/03_System_Architecture.md`)
4. **Database Design** (`docs/04_Database_Design.md`)
5. **API Specification** (`docs/05_API_Specification.md`)
6. **Backend Architecture** (`docs/06_Backend_Architecture.md`)
7. **TDD Development Guide** (`docs/16_TDD_Development_Guide.md`)
8. **Approved Execution Report - Step 6** (`Execution_Report_Step_6.md`)
9. **Architectural Recommendations on Step 7** (User Feedback on plan revision)

---

## 2. Architecture Compliance

- **Authentication Boundaries**:
  - Authentication remains completely unchanged. `JwtAuthGuard` continues to extract the JWT, verify its signature, and attach the user payload (`userId`, `email`, `role`) to the request object.
- **Dynamic Role Resolution Strategy**:
  - In this infrastructure phase, the guard verifies roles using the temporary `role` claim in the request user object (which is signed into the JWT payload).
  - In later steps (Step 9: Family Membership), we will remove the `role` field from the JWT payload entirely. The guard will then resolve the active role for the requested workspace (`familyId`) dynamically by querying the membership database, supporting multi-family users cleanly without JWT bloat.
- **Defensive Scope Alignment**:
  - **No Family Module Dependencies**: In accordance with the modular monocell guideline, all Family-scoped resource queries, family ownership checks, `FamilyOwnershipGuard`, and `AuthorizationService` are deferred to Step 8/9/10.
  - **Single Role Authority**: The roles are refined to `OWNER`, `ADMIN`, and `MEMBER`. The generic/global `USER` role is removed.
- **Database & API Stability**:
  - No database schema migrations or database modifications are planned.
  - No public endpoints are exposed. The authorization decorators and guards will be developed purely as reusable infrastructure for downstream domains.

---

## 3. Objective

Implement the reusable authorization and Role-Based Access Control (RBAC) infrastructure for the FamilyOS AI backend, establishing type-safe role definitions, route decorators, guards, and E2E verification suites without introducing premature database or family module dependencies.

---

## 4. Scope

- **Role Definitions**: Define the `UserRole` enum (`OWNER`, `ADMIN`, `MEMBER`).
- **Role Decorator Refactoring**: Refactor the `@Roles()` decorator to accept `UserRole[]` for compile-time type safety.
- **Guard Renaming and Refactoring**: 
  - Rename `RolesGuard` to `FamilyRoleGuard` to reflect family-scoped roles.
  - Refactor `FamilyRoleGuard` to validate execution flow context based on the new `UserRole` enum.
- **Default JWT Payload Update**: Update registration and login services to default the user's role payload to `OWNER` instead of `USER` (as the creator of the account acts as the primary account owner).
- **Dynamic Test Controller**: Create a dynamic `TestAuthController` registered only during tests to assert `JwtAuthGuard` and `FamilyRoleGuard` functionality.

---

## 5. Out of Scope

- `FamilyOwnershipGuard`, `RequireFamilyOwnership` decorator, and `AuthorizationService` (deferred to Step 8/10).
- Family, Family Member, OCR, AI, Notification, or Dashboard logic.
- Password resets, MFA, billing, or audit logs.

---

## 6. Files To Create

1. **[NEW]** `src/auth/enums/role.enum.ts`
   - Defines the standard workspace roles:
     ```typescript
     export enum UserRole {
       OWNER = 'OWNER',
       ADMIN = 'ADMIN',
       MEMBER = 'MEMBER',
     }
     ```
2. **[NEW]** `src/auth/guards/family-role.guard.ts` (Renamed/modified from `roles.guard.ts`)
   - Checks if the controller/route requires roles.
   - Extracts the user's role from the request and validates it against `UserRole` metadata:
     ```typescript
     @Injectable()
     export class FamilyRoleGuard implements CanActivate {
       constructor(private readonly reflector: Reflector) {}
       canActivate(context: ExecutionContext): boolean {
         const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
           context.getHandler(),
           context.getClass(),
         ]);
         if (!requiredRoles || requiredRoles.length === 0) return true;
         const request = context.switchToHttp().getRequest();
         const user = request.user;
         if (!user || !user.role) {
           throw new ForbiddenException('Access denied: User information not found or missing role');
         }
         const hasRole = requiredRoles.includes(user.role as UserRole);
         if (!hasRole) {
           throw new ForbiddenException('Access denied: Insufficient permissions');
         }
         return true;
       }
     }
     ```
3. **[NEW]** `tests/e2e/authorization.e2e-spec.ts`
   - E2E tests executing REST validation flows using a dynamically mounted controller. Asserts missing JWT, invalid roles, and valid roles.

---

## 7. Files To Modify

1. **[MODIFY]** `src/auth/decorators/roles.decorator.ts`
   - Refactor `Roles` to accept `UserRole[]` instead of strings:
     ```typescript
     import { SetMetadata } from '@nestjs/common';
     import { UserRole } from '../enums/role.enum';
     export const ROLES_KEY = 'roles';
     export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
     ```
2. **[MODIFY]** `src/auth/auth.service.ts`
   - Change default role from `USER` to `OWNER` (which corresponds to `UserRole.OWNER`) in registration and login JWT generation.
3. **[MODIFY]** `src/auth/auth.module.ts`
   - Export `FamilyRoleGuard` and clean up `RolesGuard` registration.
4. **[MODIFY]** `src/auth/decorators/decorators.spec.ts`
   - Update assertions to use `UserRole` enums.
5. **[DELETE]** `src/auth/guards/roles.guard.ts`
   - Deleted and replaced by `src/auth/guards/family-role.guard.ts`.
6. **[DELETE]** `src/auth/guards/roles.guard.spec.ts`
   - Deleted and replaced by `src/auth/specs/family-role.guard.spec.ts`.
7. **[NEW]** `src/auth/specs/family-role.guard.spec.ts`
   - Re-written unit test assertions for `FamilyRoleGuard` using the `UserRole` enum.

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

- None. No queries will be made to PostgreSQL during this step.

---

## 12. API Impact

- No public REST API endpoints are created or modified.

---

## 13. Testing Strategy

### Unit Testing
- **FamilyRoleGuard**: Verify it allows access for matching roles and throws `ForbiddenException` for mismatched or missing roles. Tests will mock the reflector context.
- **Decorators**: Assert `@Roles()` correctly binds the metadata key with `UserRole` values.

### E2E Testing (`tests/e2e/authorization.e2e-spec.ts`)
- Register a mock `TestAuthController` dynamically inside the E2E Jest application fixture:
  ```typescript
  @Controller('test-auth')
  class TestAuthController {
    @Get('admin')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, FamilyRoleGuard)
    adminOnly() { return { success: true }; }

    @Get('member')
    @Roles(UserRole.MEMBER, UserRole.OWNER)
    @UseGuards(JwtAuthGuard, FamilyRoleGuard)
    memberOrOwner() { return { success: true }; }
  }
  ```
- Scenarios:
  - **No Token**: Querying protected routes without an authorization header returns `401 Unauthorized`.
  - **Forbidden Role**: Querying `test-auth/admin` with a JWT containing `role: 'MEMBER'` returns `403 Forbidden`.
  - **Authorized Role**: Querying `test-auth/member` with a JWT containing `role: 'OWNER'` or `role: 'MEMBER'` returns `200 OK`.

---

## 14. Risks

- None. The deferral of database connectivity risk to Step 8/9/10 removes database locking or schema misalignment risks.

---

## 15. Assumptions

- **Future Role Resolution**: We assume that in future steps (Step 9/10), the `FamilyRoleGuard` will be refactored to fetch roles dynamically from family workspace memberships in the database, instead of extracting it from the JWT payload. The current JWT-based mechanism is an infrastructure sandbox to test the RBAC pipeline.

---

## 16. Open Questions

- None.

---

## 17. Implementation Sequence

### Phase 1: Infrastructure Foundations
1. Create `src/auth/enums/role.enum.ts`.
2. Modify `src/auth/decorators/roles.decorator.ts`.
3. Modify `src/auth/auth.service.ts` to assign `OWNER` instead of `USER`.

### Phase 2: Guard & Module Registration
1. Create `src/auth/guards/family-role.guard.ts`.
2. Delete the old `roles.guard.ts`.
3. Update provider declarations in `src/auth/auth.module.ts`.

### Phase 3: Unit Testing
1. Update unit tests in `src/auth/decorators/decorators.spec.ts`.
2. Create unit tests in `src/auth/specs/family-role.guard.spec.ts`.
3. Delete the old `roles.guard.spec.ts`.

### Phase 4: E2E Integration
1. Implement `tests/e2e/authorization.e2e-spec.ts` using the dynamic controller verification.
