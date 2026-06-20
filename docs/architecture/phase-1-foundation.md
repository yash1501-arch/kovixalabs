# Phase 1 Foundation

This slice implements the initial repository foundation described in `IMPLEMENT.md`.

## Services

- `apps/web`: Next.js dashboard shell.
- `apps/api`: Express API with health, brand persistence, brand memory entry ingestion/retrieval, copy generation, and AI task creation endpoints.
- `services/ai`: FastAPI service with health and placeholder copy generation endpoints.
- `services/workers`: background worker skeleton for future Redis-backed queues.
- `packages/shared`: shared Zod schemas and TypeScript types.

## Local Infrastructure

`docker-compose.yml` provides:

- PostgreSQL for relational product data.
- MongoDB for flexible raw/generated documents.
- Redis for queues, cache, and rate limits.
- Qdrant for brand memory and semantic retrieval.

## Next Implementation Slice

1. Install dependencies and generate lockfiles.
2. Run Prisma generation and first migration.
3. Add Qdrant-backed embeddings for brand memory retrieval.
4. Add prompt/model versioning for copy generation.
5. Add approval workflow and post draft persistence.
