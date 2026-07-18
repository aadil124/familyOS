# FamilyOS AI Testing Infrastructure

This directory contains the testing infrastructure, helpers, and end-to-end (E2E) test suites for the FamilyOS AI backend.

## Folder Structure

- `e2e/`: End-to-end tests validating full HTTP request lifecycles.
- `integration/`: Tests verifying interactions between multiple internal modules and the database.
- `helpers/`: Reusable testing utilities.
  - `mocks/`: Standardized mock implementations (e.g., Prisma, Config, OpenAI).
  - `factories/`: Data builders for generating consistent test objects (e.g., mock Users).

*Note: Unit tests (`*.spec.ts`) reside side-by-side with their target source files in the `src/` directory to maintain domain cohesion.*

## How to Run Tests

- **Unit Tests:** `npm run test`
- **Unit Tests (Watch Mode):** `npm run test:watch`
- **E2E Tests:** `npm run test:e2e`
- **Coverage Report:** `npm run test:cov`

## Naming Conventions

- **Unit Tests:** `[filename].spec.ts` (e.g., `health.controller.spec.ts`)
- **E2E Tests:** `[filename].e2e-spec.ts` (e.g., `health.e2e-spec.ts`)
- **Integration Tests:** `[filename].integration-spec.ts`

## Adding New Tests

1. Follow Test-Driven Development (TDD) principles (Red -> Green -> Refactor).
2. For services with external dependencies (Database, OpenAI), always inject mocks from `tests/helpers/mocks`.
3. Use data factories (`tests/helpers/factories`) instead of hardcoding objects to keep tests resilient against schema changes.

## Best Practices

- Ensure E2E tests clean up after themselves.
- Do not make actual API calls to OpenAI or Cloudinary during tests. Use the provided mocks.
- Keep tests atomic and independent. State should not bleed between `it()` blocks.
