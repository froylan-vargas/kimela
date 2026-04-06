# Docker — Local Development Commands

## Start

```bash
# Start all services (api + web) in the background
docker compose up -d

# Start and rebuild images (use after code changes to Dockerfile or dependencies)
docker compose up -d --build

# Start a single service
docker compose up -d api
docker compose up -d web
```

## Stop

```bash
# Stop all running services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Logs

```bash
# Follow logs for all services
docker compose logs -f

# Follow logs for a single service
docker compose logs -f api
docker compose logs -f web
```

## Rebuild

```bash
# Rebuild images without cache (use when dependencies change)
docker compose build --no-cache

# Rebuild a single service
docker compose build --no-cache api
```

## Shell access

```bash
# Open a shell inside a running container
docker compose exec api sh
docker compose exec web sh
```

## Status

```bash
# List running containers and their ports
docker compose ps
```

## Ports

| Service | Host URL |
|---|---|
| `api` (NestJS) | http://localhost:3000 |
| `web` (Next.js) | http://localhost:3001 |
