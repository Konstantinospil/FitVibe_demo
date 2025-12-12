# Apps Workspace

The `apps` workspace hosts the runnable surfaces of FitVibe V2. Each application is an independent PNPM workspace but they share tooling, lint rules, and TypeScript config through the `packages` directory.

## Contents

| Directory   | Description                                    | README                                |
| ----------- | ---------------------------------------------- | ------------------------------------- |
| `backend/`  | FitVibe REST API (Express + Knex + PostgreSQL) | [Backend README](backend/README.md)   |
| `frontend/` | React application with SSR built with Vite     | [Frontend README](frontend/README.md) |

Refer to the individual READMEs inside each app for setup and workflow details. Turbo tasks are configured so that running `pnpm dev` at the root will start both the backend and frontend in watch mode.

### Backend Module Structure

The backend follows a modular architecture. See [`backend/src/modules/README.md`](backend/src/modules/README.md) for details on the module structure, patterns, and how to add new modules.
