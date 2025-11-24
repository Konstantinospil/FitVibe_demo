# FitVibe V2

> A holistic fitness platform where users can plan, log, share, and track training sessions across all domains of fitness (vibes). Each vibe is represented as an element, and users are challenged to maintain balance by training holistically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

FitVibe is a comprehensive fitness tracking platform that enables individuals to plan, log, share, and track their training sessions with a clear, accessible, and responsive interface. The platform gamifies fitness through a hidden points system and encourages holistic training across six elemental vibes:

| Vibe         | Element | Activities                                          |
| ------------ | ------- | --------------------------------------------------- |
| Strength     | Earth   | Lifting, strongman, body building                   |
| Agility      | Air     | Juggling, climbing, bouldering, gymnastics, parkour |
| Endurance    | Water   | Running, hiking, cycling, rowing, jump rope         |
| Explosivity  | Fire    | Sprints, jumps, throws                              |
| Intelligence | Shadow  | Chess, shooting, sailing                            |
| Regeneration | Aether  | Yoga, stretching, fasting                           |

## Key Features

- **Session Planning & Logging**: Easy-to-use interface for planning and logging training sessions
- **Exercise Library**: Global exercise library with comparable metrics
- **Progress Tracking**: Historical data and analytics for performance monitoring
- **Social Sharing**: Share sessions with robust privacy controls
- **Gamification**: Hidden points system to encourage balanced training
- **Accessibility**: WCAG 2.1 AA compliant interface
- **Security First**: 2FA, brute-force protection, and comprehensive security measures
- **GDPR Compliant**: Privacy-by-default settings and user-controlled data management

## Architecture

FitVibe V2 is built as a **monorepo** using PNPM workspaces with a modular, scalable architecture:

```text
FitVibe V2/
├── app/
│   ├── backend/         # Express/TypeScript REST API
│   └── frontend/        # React SPA built with Vite
├── docs/                # Product, design, and governance documentation
├── infra/               # Infrastructure, Docker, Kubernetes configs
└── packages/            # Shared tooling, lint rules, TypeScript config
```

### Tech Stack

**Backend:**

- Node.js 20 LTS
- Express.js
- Knex.js (SQL query builder)
- PostgreSQL (≥14, target 16-18)
- TypeScript

**Frontend:**

- React 18
- Vite
- TypeScript

**Infrastructure:**

- Docker & Docker Compose
- Kubernetes
- NGINX (reverse proxy)
- Observability stack (Prometheus, Grafana, Loki, Tempo)

## Quick Start

### Prerequisites

- Node.js 20 or newer
- PNPM 9 (`corepack enable pnpm`)
- Docker (optional, for local Postgres/NGINX stack)
- Git with SSH access configured

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd Cursor_fitvibe
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` files in the root, `app/backend`, `app/frontend`, and `infra/` to `.env`
   - Adjust values as needed

4. **Start the development environment:**

   ```bash
   pnpm dev
   ```

   This will start both the backend and frontend in watch mode.

### Development Commands

```bash
# Start development servers
pnpm dev

# Run linting
pnpm lint

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Fix linting issues
pnpm lint --fix
```

## 📁 Project Structure

| Directory        | Description                                           | README                                     |
| ---------------- | ----------------------------------------------------- | ------------------------------------------ |
| `apps/backend/`  | FitVibe REST API (Express + Knex + PostgreSQL)        | [Backend README](apps/backend/README.md)   |
| `apps/frontend/` | React single-page application built with Vite         | [Frontend README](apps/frontend/README.md) |
| `docs/`          | Authoritative product, design, and governance content | [Docs README](docs/README.md)              |
| `infra/`         | Infrastructure configurations, Docker, Kubernetes     | [Infra README](infra/README.md)            |
| `packages/`      | Shared tooling, lint rules, TypeScript config         | [Packages README](packages/README.md)      |
| `scripts/`       | Utility scripts for development and maintenance       | [Scripts README](scripts/README.md)        |
| `tests/`         | Test suites (E2E, integration, performance)           | [Tests README](tests/README.md)            |

Refer to the individual READMEs inside each directory for detailed setup and workflow information.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Product Requirements Document](docs/1.Product_Requirements/1.Product_Requirements_Document.md)** - Business goals, user journeys, and feature scope
- **[Technical Design Document](docs/2.Technical_Design_Document/)** - System architecture, data flows, and integration plans
- **[Testing & QA Plan](docs/4.Testing_and_Quality_Assurance_Plan/)** - Test strategy, quality gates, and release criteria
- **[Architecture Decision Records](docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/)** - ADRs documenting key technical decisions
- **[Design System](docs/3.Sensory_Design_System/)** - Personas, visual design, and user flows
- **[Policies](docs/5.Policies/)** - Security, privacy, legal, and operational policies

See the [Documentation Hub README](docs/README.md) for a complete guide to all documentation.

### Infrastructure Documentation

- **[Docker Configurations](infra/docker/README.md)** - Docker Compose and Dockerfile documentation
- **[Kubernetes Configurations](infra/kubernetes/README.md)** - K8s deployment manifests and guides
- **[Observability Stack](infra/observability/README.md)** - Prometheus, Grafana, Loki, Tempo setup
- **[NGINX Configuration](infra/nginx/README.md)** - Reverse proxy and security headers
- **[Security Policies](infra/security/README.md)** - Security procedures and incident management
- **[Infrastructure Scripts](infra/scripts/README.md)** - Database and operational scripts

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](docs/CONTRIBUTING.md) before submitting pull requests. Key points:

- Branch from `develop` for new features
- Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Keep PRs focused and include tests
- Update documentation for any changes

## 🔒 Security

- Follow the guidance in `docs/SECURITY.md` for responsible disclosure
- Never commit secrets, API keys, or personal data
- Report vulnerabilities privately to `kpilpilidis@gmail.com`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Owner

Konstantinos Pilpilidis (Dr.)

---

For more information, visit the [Documentation Hub](docs/README.md) or check the individual application READMEs in `app/backend/` and `app/frontend/`.
