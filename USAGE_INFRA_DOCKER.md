# Using Docker Compose from infra/

## Option 1: Use infra docker-compose directly (Recommended)

From the project root:

```bash
# Development environment
docker compose -f infra/docker/dev/docker-compose.dev.yml up --build

# Or in detached mode
docker compose -f infra/docker/dev/docker-compose.dev.yml up -d --build
```

This will:

- Build backend and frontend using infra Dockerfiles
- Frontend is built and served via nginx (port 80, mapped to 5173)
- Backend runs production build but with source mounted for hot reload
- Includes PostgreSQL database

## Option 2: Update root docker-compose.yml to use infra Dockerfiles

The root docker-compose.yml has been updated to reference:

- `infra/docker/dev/Dockerfile.backend` (target: runtime)
- `infra/docker/dev/Dockerfile.frontend` (no target, uses final stage)

**Note**: The infra Dockerfiles are production builds:

- Frontend: Built static files served via nginx (not Vite dev server)
- Backend: Production build (but source is mounted for potential hot reload)

If you need Vite dev server with HMR, you'll need development-specific Dockerfiles.

## Services Available

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5173 (via nginx)
- **NGINX**: http://localhost:80
- **PostgreSQL**: localhost:5432

## Environment Variables

The infra docker-compose uses `.env.example` by default. Make sure your `.env` file has:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD` (if using Redis)
- `GRAFANA_ADMIN_PASSWORD` (if using Grafana)
