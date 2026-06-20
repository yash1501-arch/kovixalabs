# KOVIXAILABS AISMOS

AISMOS is an AI-native social media operating system for brand memory, trend analysis, content generation, publishing, analytics, and learning loops.

This repository is scaffolded as a monorepo:

```text
apps/
  web/        Next.js dashboard
  api/        Node.js business API
packages/
  shared/     Shared TypeScript schemas and types
services/
  ai/         FastAPI AI orchestration service
  workers/    Background job worker skeleton
docs/
  architecture/
```

## Local Development

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Install JavaScript dependencies:

```bash
npm install
```

3. Install Python dependencies for the AI service:

```bash
python -m venv .venv
.venv\\Scripts\\pip install -r services/ai/requirements.txt
```

4. Start local infrastructure:

```bash
npm run dev:services
```

5. Start services in separate terminals:

```bash
npm run dev:web
npm run dev:api
npm run dev:ai
npm run dev:workers
```

## Current Status

The first implementation slice establishes the foundation from `IMPLEMENT.md`:

- Monorepo structure
- Next.js web shell
- Node.js API shell
- FastAPI AI service shell
- Shared schema package
- Prisma schema draft
- Local PostgreSQL, MongoDB, Redis, and Qdrant infrastructure

