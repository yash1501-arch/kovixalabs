.PHONY: dev dev-infra build up down logs ps prune

# ── Development ───────────────────────────────────────────────

dev:
	npm run dev:all

dev-infra:
	docker compose up -d postgres mongo redis qdrant

dev-infra-stop:
	docker compose down

# ── Docker Build & Run ────────────────────────────────────────

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

prune:
	docker system prune -af --volumes

# ── Individual Service Builds ─────────────────────────────────

build-api:
	docker build -f apps/api/Dockerfile -t aismos/api:latest .

build-ai:
	docker build -f services/ai/Dockerfile -t aismos/ai:latest .

build-web:
	docker build -f apps/web/Dockerfile -t aismos/web:latest .

build-workers:
	docker build -f services/workers/Dockerfile -t aismos/workers:latest .

# ── Database ───────────────────────────────────────────────────

db-migrate:
	npm --workspace @kovixalabs/api run db:migrate

db-generate:
	npm --workspace @kovixalabs/api run prisma:generate

db-reset:
	docker compose down -v
	docker compose up -d postgres
	sleep 3
	npm --workspace @kovixalabs/api run db:migrate

# ── Testing ────────────────────────────────────────────────────

test:
	npm run test

test-ai:
	npm run test:ai

typecheck:
	npm run typecheck

lint:
	npm run lint

# ── Cleanup ────────────────────────────────────────────────────

clean:
	rm -rf apps/*/dist packages/*/dist
	rm -rf node_modules .next
	npm ci
