# NUVYO — Connected Work Management

NUVYO is an open-source work management platform that connects portfolios, projects, tasks, KPIs, clients, teams, support, work logs and AI-powered reporting in one operational system.

It was created for organizations that need more visibility between strategy, execution and management decisions — while keeping control over their infrastructure and data.

## Why NUVYO?

NUVYO brings operational execution and management visibility into the same workflow:

- Portfolio and project management
- Kanban and Gantt views
- Tasks, priorities, deadlines and time tracking
- Configurable KPIs connected to projects
- Client, team and organizational-area management
- Work logs, comments, notifications and support tickets
- AI-powered management reports
- Role-based access control and hierarchical permissions
- Multi-factor authentication and audit logs
- Self-hosted deployment with Docker

## AI-powered reporting

Authorized managers can generate reports from the organization’s own data using Google Gemini, OpenAI or Anthropic Claude.

The reporting system supports:

- Executive summaries
- Portfolio analysis
- Productivity and workload reviews
- Risk analysis
- Customer and project follow-up
- A Senior Project Manager template with 7-, 30- and 90-day action plans
- Custom report templates
- Scope filters by company, area, client or contributor
- Report history and PDF export

The backend applies permissions before preparing the context sent to the selected AI provider. API keys are encrypted on the server and are never returned to the frontend.

## Architecture

```text
Browser
   │
   ▼
React + Vite ─────────────── Nginx or Vercel
   │ HTTPS /api
   ▼
Express + TypeScript ─────── Node service or container
   ├── PostgreSQL ─────────── Docker or Supabase
   ├── Persistent uploads ─── avatars and images
   └── AI provider ────────── Gemini, OpenAI or Claude (optional)
```

Main technologies:

- React and TypeScript
- Node.js and Express
- PostgreSQL
- Docker and Docker Compose
- Vite
- Google Gemini, OpenAI and Anthropic Claude
- Nginx

## Security

NUVYO includes security controls designed for real operational environments:

- HttpOnly, Secure and SameSite cookies
- Server-side authorization by role, area, ownership and sharing
- MFA using TOTP
- Encrypted TOTP secrets and AI provider keys
- Password hashing, rate limiting and progressive lockout
- Password recovery with expiration and attempt limits
- CORS allowlists and security headers
- Upload validation and image processing
- Audit logs
- Dependency and secret scanning in GitHub Actions

Security controls are not a certification by themselves. Organizations should also define their own policies for access, backups, continuity, privacy and incident response.

## Quick start with Docker

### Requirements

- Git
- Docker Engine 24+ with Docker Compose v2
- OpenSSL

### 1. Clone and configure

```bash
git clone https://github.com/seccors-86/Nuvyo.git
cd Nuvyo
cp .env.example .env
```

Generate strong values for `POSTGRES_PASSWORD`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY` and `BOOTSTRAP_ADMIN_PASSWORD`:

```bash
openssl rand -hex 32
```

Add the values to `.env` and configure the initial administrator.

### 2. Start the application

```bash
docker compose up -d --build
docker compose ps
```

The public landing page is available at `http://localhost:8088` and the application at `http://localhost:8088/app`.

Health endpoint:

```text
http://localhost:8088/health
```

### 3. Basic operations

```bash
# Follow logs
docker compose logs -f backend frontend postgres

# Rebuild after an update
git pull
docker compose up -d --build

# Stop without deleting data
docker compose down
```

The `postgres_data` and `uploads_data` volumes preserve database records and uploaded files. Use `docker compose down -v` only when deleting those data is intentional.

## Deployment options

### Docker Compose

Recommended for local testing, a private server or a simple self-hosted production environment.

### Vercel + Supabase

This architecture uses:

1. Supabase for managed PostgreSQL;
2. A persistent Node host for the Express API and uploads;
3. Vercel for the React frontend.

The Express API must remain available as a persistent service. The frontend should not expose database credentials or service keys through `VITE_*` variables.

### VPS

Run the full application with Docker Compose behind Nginx, Caddy or another reverse proxy. Configure HTTPS, backups, persistent volumes and environment secrets before exposing it publicly.

## Demo environment

The repository includes a fictional demo dataset and a dedicated Docker Compose override for exploring the platform locally.

```bash
docker compose -p nuvyo-demo -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

Demo users and passwords are intentionally predictable and must never be enabled in a production environment.

## Open source

NUVYO is distributed under the Apache 2.0 license. You can study, modify and deploy the project according to the license terms.

The project was built through an AI-assisted development workflow, combining human product direction, architecture decisions, prompt engineering, implementation guidance, testing, validation and continuous iteration.

## Links

- Live landing page: https://nuvyo.ttcd.com.br/
- English landing page: https://nuvyo.ttcd.com.br/en
- Repository: https://github.com/seccors-86/Nuvyo
- Portuguese documentation: [README.md](README.md)
- Security policy: [SECURITY.md](SECURITY.md)

## License

Apache 2.0. See [LICENSE](LICENSE).
