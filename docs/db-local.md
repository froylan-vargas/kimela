# Local database guide

## Prerequisites

- Docker Desktop running
- pnpm installed
- `.env` file at repo root (copy from `.env.example` if missing)

## Start the database

```bash
# From repo root — starts only the postgres service
docker compose up postgres -d
```

Wait for it to be healthy:

```bash
docker compose ps
# postgres should show "(healthy)"
```

## Browse the database in a browser — Prisma Studio

Prisma Studio is the simplest option: zero extra tools, runs in your browser, reads the schema automatically.

```bash
cd apps/api
pnpm db:studio
# Opens http://localhost:5555
```

From Studio you can browse tables, filter rows, and edit records without writing SQL.

## Run a raw SQL query

If you prefer a SQL client, connect with any tool that supports PostgreSQL (TablePlus, DBeaver, psql) using these credentials (from `.env`):

| Field    | Value           |
| -------- | --------------- |
| Host     | `localhost`     |
| Port     | `5432`          |
| Database | `qimela_db`     |
| User     | `qimela`        |
| Password | `qimela_secret` |

Example with `psql` (if installed locally):

```bash
psql postgresql://qimela:qimela_secret@localhost:5432/qimela_db
```

Sample queries after running migrations:

```sql
-- List all users
SELECT * FROM users;

-- List open qimelas
SELECT * FROM qimelas WHERE status = 'OPEN';

-- Count subscriptions per qimela
SELECT k.name, COUNT(s.id) AS subscriptions
FROM qimelas k
LEFT JOIN subscriptions s ON s.qimela_id = k.id
GROUP BY k.name;
```

## Apply migrations

```bash
cd apps/api

# Create and apply a new migration
pnpm db:migrate

# Deploy existing migrations (CI / production)
pnpm db:migrate:deploy

# Reset DB and re-apply all migrations (destroys data)
pnpm db:reset
```

## Stop the database

```bash
docker compose stop postgres
```

Data is persisted in the `postgres_data` Docker volume and survives container restarts.
