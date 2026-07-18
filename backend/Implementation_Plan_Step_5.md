# Implementation Plan - Step 5: Users Domain Foundation

## Documentation Reviewed
The following documents have been reviewed and served as the single source of truth for this plan:
1. **Project Blueprint** (`docs/project-blueprint.md` / `docs/01_Project_Blueprint.md`)
2. **Product Requirements Document (PRD)** (`docs/02_PRD.md`)
3. **System Architecture** (`docs/03_System_Architecture.md`)
4. **Database Design** (`docs/04_Database_Design.md`)
5. **API Specification** (`docs/05_API_Specification.md`)
6. **Backend Architecture** (`docs/06_Backend_Architecture.md`)
7. **TDD Development Guide** (`docs/16_TDD_Development_Guide.md`)
8. **Git Workflow** (`docs/09_Git_Workflow.md`)

---

## Architecture Compliance
- **Folder Structure**: Follows modular architecture under `src/users/`.
- **Database Schema**: Adheres to the `User` model structure defined in `prisma/schema.prisma`.
- **Repository Pattern**: Utilizes `UsersRepository` to isolate data access from business logic.
- **Repository Rule**: No business logic inside the repository. The repository is persistence-only. Business rules belong exclusively in `UsersService`.
- **Entities & Protection**: Prisma entities are never exposed directly. `UserResponseDto` will be used as the standard representation returned to client layers.
- **APIs & Routes**: No controllers or API routing logic will be defined.

---

## Objective
Establish the core database access layer, business logic service, validation schemas (DTOs), interfaces, and unit testing structure for the singular `User` domain.

---

## Scope
- Creation of `UsersRepository` for persistence-only database access.
- Creation of `UsersService` to run business logic and orchestrate data.
- Password hashing integration by calling functions from the existing password utility (`src/auth/utils/password.util.ts`), without calling `bcrypt` directly.
- Defining DTO classes: `CreateUserDto`, `UpdateUserDto`, and `UserResponseDto`.
- Explicit validation in DTOs using `class-validator` for:
  - `email` (valid email string)
  - `password` (required string matching length/complexity)
  - `firstName` (required non-empty string)
  - `lastName` (required non-empty string)
- Defining TypeScript interfaces in `src/users/interfaces/user.interface.ts`.
- Exporting required providers from `UsersModule` and importing it into the main `AppModule`.
- Creating service unit tests in `src/users/specs/users.service.spec.ts`.

---

## Out of Scope
- HTTP controllers or routing logic.
- Workflow logic for registration, authentication, login, refresh tokens, or session validation.
- Family workspace creation triggers or workspace association logic.
- Database migrations or schema updates.
- Other domain modules (Family, Documents, OCR, AI, Readiness, Notifications).

---

## Files To Create
1. `src/users/interfaces/user.interface.ts`
   - Defines interfaces for user attributes and query options (e.g. soft delete awareness).
2. `src/users/dto/create-user.dto.ts`
   - Payload for creating a user. Validates `email`, `password`, `firstName`, and `lastName`.
3. `src/users/dto/update-user.dto.ts`
   - Payload for modifying user attributes. Validates optional update fields.
4. `src/users/dto/user-response.dto.ts`
   - Standard output DTO protecting raw database records and password hashes.
5. `src/users/users.repository.ts`
   - Class resolving database access (find, create, update, soft delete). Includes no business logic.
6. `src/users/users.service.ts`
   - Service implementing business logic. Integrates password utilities and maps properties (e.g., combining `firstName` and `lastName` into DB `fullName`).
7. `src/users/specs/users.service.spec.ts`
   - Unit tests for `UsersService`. Mocks `UsersRepository` and the password utility. Does not mock Prisma.

---

## Files To Modify
1. `src/users/users.module.ts`
   - Declare providers (`UsersService`, `UsersRepository`) and exports.
2. `src/app.module.ts`
   - Import `UsersModule` to include it in the application's root registry. No other modules are modified.

---

## Dependencies To Add
- None.

---

## Database Impact
- Uses the existing `User` model in `schema.prisma`. No database migrations or updates are required.
- Handles soft deletion state via a nullable `deletedAt` timestamp. The plan guarantees that physical deletes are not supported; database records are marked using `deletedAt`.

---

## API Impact
- None. No HTTP endpoints or routing definitions are exposed in this step.

---

## Testing Strategy
- **Service Testing**: 
  - Unit tests will focus exclusively on the business logic inside `UsersService`.
  - Mocks: `UsersRepository` and password utilities will be mocked. Prisma client is not mocked directly.
  - Assert that:
    - User creation successfully hashes the password and saves the mapped user data.
    - Error conditions (e.g., existing email conflicts) are handled gracefully.
    - Soft delete modifies the `deletedAt` field and status without performing physical deletion.

---

## Risks
- Running tests locally on the AI runner may fail due to terminal restrictions (AppLocker/Group Policy).
  - *Mitigation*: Ensure clean unit test files are generated that can be easily compiled and verified by the user locally.

---

## Assumptions
- Hashing utilities (`hashPassword` and `comparePassword`) from Step 4 are importable and functional.
- The `User` model's `fullName` field in the database will be populated by concatenating `firstName` and `lastName` from the DTO.

---

## Open Questions
None.

---

## Implementation Sequence
1. **Phase 1: Interfaces & DTOs**
   - Create `src/users/interfaces/user.interface.ts`.
   - Create `CreateUserDto`, `UpdateUserDto`, and `UserResponseDto`.
2. **Phase 2: Repository Layer**
   - Create persistence-only `UsersRepository` injecting `PrismaService`. Keep it void of business logic.
3. **Phase 3: Service Layer**
   - Create `UsersService` with methods: `createUser()`, `findById()`, `findByEmail()`, `updateUser()`, `softDeleteUser()`, and `existsByEmail()`.
4. **Phase 4: Registration & Tests**
   - Wire `UsersModule` and import it into `AppModule`.
   - Implement `users.service.spec.ts` mocking repository and password utilities.
