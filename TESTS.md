# Running Tests

## API Tests

All test commands are run from the **API app directory** or via the workspace root.

### Prerequisites

```bash
# Install all dependencies from the workspace root
pnpm install

# Generate the Prisma client (required before running any tests)
pnpm --filter @kimela/api db:generate
```

### Unit Tests (no database required)

Unit tests cover the mapper, use case, and controller with mocked dependencies.

```bash
# From workspace root
pnpm --filter @kimela/api test

# Or run directly from the API app directory
cd apps/api
npx jest --testPathIgnorePatterns="prisma-kimela.repository.spec.ts"
```

### Run tests in watch mode

```bash
cd apps/api
npx jest --watch --testPathIgnorePatterns="prisma-kimela.repository.spec.ts"
```

### Run tests with coverage

```bash
cd apps/api
npx jest --coverage --testPathIgnorePatterns="prisma-kimela.repository.spec.ts"
```

### Run a specific test file

```bash
cd apps/api
npx jest kimela.mapper
npx jest get-kimelas-for-user.use-case
npx jest kimela.controller
```

---

## Web (UI) Tests

All test commands are run from the **web app directory** or via the workspace root.

### Prerequisites

```bash
# Install all dependencies from the workspace root
pnpm install
```

### Run all UI tests

```bash
# From workspace root
pnpm --filter @kimela/web test

# Or from the web app directory
cd apps/web
npx vitest run
```

### Run tests in watch mode

```bash
cd apps/web
npx vitest
```

### Run a specific test file

```bash
cd apps/web
npx vitest KimelaDropdown
npx vitest KimelaSelector
npx vitest useKimelas
npx vitest page
```

### Run tests with coverage

```bash
cd apps/web
npx vitest run --coverage
```

---

## Integration Tests (requires PostgreSQL)

Integration tests hit a real database. They are located at:

```
apps/api/src/modules/kimela/infrastructure/persistence/prisma-kimela.repository.spec.ts
```

### Setup

1. Make sure Docker is running and start the database:

```bash
# From workspace root
docker compose up -d
```

2. Run the initial migration:

```bash
pnpm --filter @kimela/api db:migrate
```

3. Ensure `apps/api/.env` has the correct `DATABASE_URL`:

```env
DATABASE_URL=postgresql://kimela:kimela_secret@localhost:5432/kimela_db?schema=public
```

4. Run the integration tests:

```bash
cd apps/api
npx jest prisma-kimela.repository
```

### Run all tests (unit + integration)

```bash
cd apps/api
npx jest
```

### Notes

- Integration tests clean the `subscriptions`, `kimelas`, and `users` tables in `beforeEach` to ensure a fresh state.
- Do **not** run integration tests against a production database.
- The `DATABASE_URL` must point to the running PostgreSQL instance with the Prisma schema applied.
- Prisma v7 uses driver adapters (`@prisma/adapter-pg`). The `DATABASE_URL` env var is read from `apps/api/.env`.
