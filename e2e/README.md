# End-to-End Testing Suite

This directory contains comprehensive end-to-end tests for the Carbon Credit Registry system, covering all major workflows and features.

## Test Structure

- **`auth.spec.ts`** - Authentication flow (login/logout for all roles)
- **`project-lifecycle.spec.ts`** - Complete project lifecycle (DRAFT → UNDER_REVIEW → NEEDS_CHANGES → APPROVED)
- **`issuance-workflow.spec.ts`** - Issuance workflow (CREATE → UNDER_REVIEW → FINALIZED with credits)
- **`credit-operations.spec.ts`** - Credit holdings, transfers, and retirements
- **`public-explorer.spec.ts`** - Public-facing explorer and stats endpoints
- **`complete-workflow.spec.ts`** - Full end-to-end flow from project creation to retirement

## Running Tests

### Prerequisites

Make sure the application is running:

```bash
# Start database
docker compose up postgres -d

# Start API (in separate terminal)
cd api && pnpm dev

# Start UI (in separate terminal)
cd ui && pnpm dev
```

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test e2e/auth.spec.ts
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Coverage

### User Authentication
- ✅ Login with different roles (Admin, Issuer, Verifier, Viewer)
- ✅ Form validation
- ✅ Logout functionality

### Project Lifecycle
- ✅ Create project in DRAFT status
- ✅ Submit for review
- ✅ Admin approves/rejects project
- ✅ View feedback for NEEDS_CHANGES projects
- ✅ Edit and resubmit after feedback

### Issuance Workflow
- ✅ Create issuance request
- ✅ Admin approves issuance
- ✅ Automatic credit batch creation
- ✅ Serial number allocation
- ✅ View finalized issuances with serials
- ✅ Admin rejects with reason
- ✅ Issuer sees rejection reason
- ✅ Create new issuance after rejection

### Credit Operations
- ✅ View credit holdings
- ✅ Display serial number ranges
- ✅ Initiate credit transfers
- ✅ View transfer history
- ✅ Retire credits
- ✅ Generate retirement certificates
- ✅ View retirement history

### Public Explorer
- ✅ Load explorer without authentication
- ✅ Display approved projects
- ✅ Show project statistics
- ✅ Open project details modal
- ✅ Show serial ranges in public view
- ✅ Display tokenization status
- ✅ Show ProvenancePill with class ID

### Complete Workflow
- ✅ Full end-to-end flow: Project → Issuance → Credits → Retirement

## Test Data

The tests use seed data from the database:

- **Admin**: `admin@carbonregistry.test` / `password123`
- **Issuer**: `issuer@carbonregistry.test` / `password123`
- **Verifier**: `verifier@carbonregistry.test` / `password123`
- **Viewer**: `viewer@carbonregistry.test` / `password123`

## CI/CD Integration

The tests are configured to run in CI environments with automatic retry on failure:

```bash
# Run with 2 retries on CI
CI=true npx playwright test
```

## Screenshots and Videos

Playwright automatically captures:
- **Screenshots** on test failure
- **Videos** on test failure (optional)
- **Traces** for debugging

View results in the HTML report:
```bash
npx playwright show-report
```

## Debugging

### View Test Execution

```bash
# Run with UI mode (interactive)
npx playwright test --ui
```

### Debug Specific Test

```bash
# Run specific test in debug mode
npx playwright test --debug auth.spec.ts:42
```

### Use Browser DevTools

In debug mode, Playwright opens a browser with DevTools, allowing you to:
- Set breakpoints
- Inspect elements
- View network requests
- Debug JavaScript

## Best Practices

1. **Isolation**: Each test should be independent and not rely on previous test state
2. **Page Object Model**: Use page objects for reusable components (future enhancement)
3. **Assertions**: Use descriptive assertions and wait for elements
4. **Retry Logic**: Let Playwright handle retries with `waitForSelector`
5. **Clean State**: Reset database between test runs if needed

## Continuous Improvement

As the application evolves, keep tests updated:
- Add tests for new features
- Update tests when UI changes
- Maintain test data consistency
- Review and remove outdated tests

