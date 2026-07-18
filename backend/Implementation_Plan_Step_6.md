# Implementation Plan - Step 6: Authentication APIs

## 1. Documentation Reviewed
The following single sources of truth were reviewed to construct this plan:
1. **Project Blueprint** (`docs/project-blueprint.md`)
2. **Product Requirements Document (PRD)** (`docs/02_PRD.md`)
3. **System Architecture** (`docs/03_System_Architecture.md`)
4. **Database Design** (`docs/04_Database_Design.md`)
5. **API Specification** (`docs/05_API_Specification.md`)
6. **Backend Architecture** (`docs/06_Backend_Architecture.md`)
7. **TDD Development Guide** (`docs/16_TDD_Development_Guide.md`)
8. **Git Workflow** (`docs/09_Git_Workflow.md`)
9. **Approved Implementation Plan - Step 5** (`Implementation_Plan_Step_5.md`)
10. **Approved Execution Report - Step 5** (`Execution_Report_Step_5.md`)

---

## 2. Architecture Compliance
- **Domain Boundaries**:
  - `UsersService` remains the sole authority for managing the user domain logic (e.g. creating users, searching by email/ID, checking uniqueness).
  - `AuthService` handles authentication orchestration, credential validation, token exchange, and token revocation.
  - `TokenService` handles JWT token generation and validation.
  - `PasswordUtil` handles all bcrypt hashing and comparison.
- **Repository Pattern**: Extends persistence-only operations for the `RefreshToken` entity via `RefreshTokenRepository`. No business rules are present in the repository layer.
- **Controller Boundaries**: `AuthController` extracts request parameters, validates input payloads using DTOs and `class-validator`, and delegates all business flow to services. It contains no direct Prisma or database access.
- **DTO Isolation**: Prisma entities are never returned directly to the client; all outputs map to clean data structures (e.g., `LoginResponseDto`, `RegisterResponseDto`, `TokenPairResponseDto`).

---

## 3. Objective
Implement the authentication controller, logic service, and refresh token data-access layers to expose REST APIs for registering, logging in, refreshing sessions, logging out, and retrieving current user profiles under the `/api/v1/auth/` prefix.

---

## 4. Scope

### API Routes
- `POST /api/v1/auth/register` (Public)
  - Accepts: `RegisterDto` (firstName, lastName, email, password)
  - Returns: `RegisterResponseDto` (user, accessToken, refreshToken)
- `POST /api/v1/auth/login` (Public)
  - Accepts: `LoginDto` (email, password)
  - Returns: `LoginResponseDto` (user, accessToken, refreshToken)
- `POST /api/v1/auth/refresh` (Public)
  - Requires: No Access Token.
  - Accepts: `RefreshDto` (refreshToken) in request body.
  - Action: Rotation performed. Validates refresh token, revokes the old refresh token, registers replacement, issues new Access & Refresh tokens.
  - Returns: `TokenPairResponseDto` (accessToken, refreshToken)
- `POST /api/v1/auth/logout` (Protected by `JwtAuthGuard`)
  - Requires: `Authorization: Bearer accessToken` header.
  - Action: Extends `@CurrentUser()` to obtain `userId`, calls `AuthService.logout(userId)`. Revokes all active refresh tokens associated with that user. No refresh token is sent in the request body.
- `GET /api/v1/auth/me` (Protected by `JwtAuthGuard`)
  - Requires: `Authorization: Bearer accessToken` header.
  - Action: Retrieves profile details of the logged-in user.
  - Returns: `UserResponseDto`

### DTO Validations
- **RegisterDto**:
  - `email`: `@IsEmail()`, `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`
  - `password`: `@IsString()`, `@IsNotEmpty()`, `@MinLength(8)`, `@MaxLength(100)`, `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.' })`
  - `firstName`: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(50)`
  - `lastName`: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(50)`
- **LoginDto**:
  - `email`: `@IsEmail()`, `@IsString()`, `@IsNotEmpty()`
  - `password`: `@IsString()`, `@IsNotEmpty()`
- **RefreshDto**:
  - `refreshToken`: `@IsString()`, `@IsNotEmpty()`

### Swagger Decorators
- Ensure all endpoints in `AuthController` are annotated with:
  - `@ApiTags('Auth')`
  - `@ApiOperation()`
  - `@ApiCreatedResponse()` / `@ApiOkResponse()`
  - `@ApiBadRequestResponse()`
  - `@ApiUnauthorizedResponse()`
  - `@ApiConflictResponse()`
  - `@ApiBearerAuth('access-token')` (for protected routes)

---

## 5. Out of Scope
- Role-based authorization controls or `RolesGuard` enhancements.
- Family workspace creation triggers during registration (to be implemented in family milestone).
- Document modules, OCR pipelines, AI components.
- Email verification, password reset, multi-factor authentication (MFA), rate limiting.

---

## 6. Files To Create
1. `src/auth/dto/register.dto.ts`
   - Input schema validating `firstName`, `lastName`, `email`, and `password`.
2. `src/auth/dto/login.dto.ts`
   - Input schema validating `email` and `password`.
3. `src/auth/dto/refresh.dto.ts`
   - Input schema validating `refreshToken`.
4. `src/auth/dto/auth-response.dto.ts`
   - Response structures: `LoginResponseDto`, `RegisterResponseDto`, `TokenPairResponseDto`, and `AuthUserResponseDto`.
5. `src/auth/interfaces/refresh-token.interface.ts`
   - Interfaces for database refresh token inputs and queries.
6. `src/auth/repositories/refresh-token.repository.ts`
   - Persistence repository for the `RefreshToken` entity (no business logic):
     - `create(data: RefreshTokenCreateInput)`
     - `findActiveToken(token: string)`
     - `revoke(id: string)`
     - `update(id: string, data: RefreshTokenUpdateInput)`
     - `findById(id: string)`
7. `src/auth/auth.service.ts`
   - Business service containing these explicit methods (coordinates rotation, expiry, validation, replay detection):
     - `register(registerDto: RegisterDto): Promise<RegisterResponseDto>`
     - `login(loginDto: LoginDto): Promise<LoginResponseDto>`
     - `refresh(refreshToken: string): Promise<TokenPairResponseDto>`
     - `logout(userId: string): Promise<void>`
     - `validateCredentials(email: string, password: string): Promise<UserResponseDto>`
8. `src/auth/auth.controller.ts`
   - Routing controller for `/api/v1/auth/*` endpoints.
9. `src/auth/specs/auth.service.spec.ts`
    - Unit tests for `AuthService`.
10. `src/auth/specs/auth.controller.spec.ts`
    - Unit tests for `AuthController`.
11. `tests/auth.e2e-spec.ts`
    - Integration/E2E tests executing full register, login, refresh, logout, and me lifecycle flows using an isolated database.

---

## 7. Files To Modify
1. `src/auth/auth.module.ts`
   - Wire `AuthService`, `AuthController`, `RefreshTokenRepository` and import `UsersModule`.

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
- Interacts with the existing `refresh_tokens` table. Writes new tokens, soft-revokes tokens via `revokedAt`/`status`, and tracks replacements through `replacedByTokenId`. The token value is stored directly in the `tokenHash` database field, treating it as the token identifier. No schema migrations or new cryptographic features are introduced.

---

## 12. API Impact
Adds the following REST APIs under version `v1`:
- `POST /api/v1/auth/register` (Public)
- `POST /api/v1/auth/login` (Public)
- `POST /api/v1/auth/refresh` (Public)
- `POST /api/v1/auth/logout` (Protected by `JwtAuthGuard`)
- `GET /api/v1/auth/me` (Protected by `JwtAuthGuard`)

---

## 13. Testing Strategy
- **Unit Testing**:
  - `AuthService`: Mock `UsersService`, `TokenService`, `RefreshTokenRepository`, and `PasswordUtil`. Test success/failure behaviors for registration, credential checks, token rotation, and invalidation.
  - `AuthController`: Mock `AuthService` and test status codes, payload parsing, and guards.
- **Integration Testing**:
  - E2E test file (`tests/auth.e2e-spec.ts`) using Nest `INestApplication` and `supertest`.
  - Scenarios:
    - **Success Paths**: Successful registration, login with credentials, refresh token rotation, logout invalidation, and retrieving current profile.
    - **Error Paths**: Duplicate email conflict during registration, invalid login credentials, expired or invalid refresh token rotation, access denial for protected routes, and bad request formats.

---

## 14. Risks
- OS Group Policy restrictions on the test runner: We cannot run tests synchronously on the agent's side.
  - *Mitigation*: Ensure test suites are thoroughly structured and detailed so they compile and run cleanly when executed by the user.

---

## 15. Assumptions
- Password hashing utilities (`hashPassword` and `comparePassword`) from Step 4 are importable and functional.
- Old refresh tokens are fully revoked in the database upon successful rotation, preventing replay attacks.
- No name-splitting logic is performed in the Auth module. The DTO passes `firstName` and `lastName` directly to `UsersService.createUser`.

---

## 16. Open Questions
None.

---

## 17. Implementation Sequence

### Phase 1: Models & DTOs
1. Create `src/auth/interfaces/refresh-token.interface.ts`.
2. Create input DTOs: `RegisterDto`, `LoginDto`, `RefreshDto`.
3. Create response DTOs in `src/auth/dto/auth-response.dto.ts`.

### Phase 2: Persistence Layer
1. Implement `RefreshTokenRepository` under `src/auth/repositories/refresh-token.repository.ts`.

### Phase 3: Core Logic
1. Implement `AuthService` logic for credential validation, registration, logout, and token rotation.
2. Implement `AuthController` routes with Swagger decorators.

### Phase 4: Integration & Spec Wiring
1. Update `AuthModule` imports/exports.
2. Implement unit tests (`auth.service.spec.ts`, `auth.controller.spec.ts`).
3. Implement integration tests (`tests/auth.e2e-spec.ts`).
