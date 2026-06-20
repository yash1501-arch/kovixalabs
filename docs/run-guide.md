# Running AISMOS Locally

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| npm | >= 10 | `npm --version` |
| Python | >= 3.11 | `python --version` |
| PostgreSQL | 14+ (remote or local) | — |

No Docker required. Databases run externally — a remote PostgreSQL is pre-configured.

---

## 1. Install Dependencies

From the project root:

```bash
# All npm packages (API, Web, Workers)
npm install

# Python AI service
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r services/ai/requirements.txt

# Build shared TypeScript package
npm run build:shared
```

---

## 2. Environment Variables

Two `.env` files matter:

**`apps/api/.env`** — loaded by the Express API:

```env
DATABASE_URL=postgres://user:pass@host:5432/postgres?sslmode=require
ENCRYPTION_SECRET=your-32-char-min-secret

META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
```

The remote PostgreSQL at `db.prisma.io` is pre-configured. If running locally, point `DATABASE_URL` to your own instance and run `npx prisma migrate dev` to create tables.

**`services/ai/.env`** — loaded by the Python AI service:

```env
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-key
LLM_MODEL=gpt-4o-mini
```

Social OAuth credentials (`TWITTER_CLIENT_ID`, `LINKEDIN_CLIENT_ID`, etc.) are optional — they're only needed if you want to connect real social accounts.

---

## 3. Start Everything (One Command)

```bash
npm start
```

This runs `scripts/start-dev.mjs`, which:
1. Generates the Prisma client
2. Runs database migrations
3. Launches all 4 services via `concurrently`

### Services

| Service | URL | Command |
|---|---|---|
| API (Express) | http://localhost:4000 | `npm run dev:api` |
| Web (Next.js) | http://localhost:3000 | `npm run dev:web` |
| AI (FastAPI) | http://localhost:8000 | `npm run dev:ai` |
| Workers | — | `npm run dev:workers` |

### Individual Start (Faster)

Kill any lingering processes first:

```bash
node scripts/kill-ports.mjs
```

Then start only what you need:

```bash
npm run dev:api      # API only
npm run dev:web      # Frontend only
npm run dev:workers  # Scheduler + queues
npm run dev:ai       # Python AI service
```

---

## 4. Database

### Remote (default)

The project uses a remote PostgreSQL at `db.prisma.io`. Migrations run automatically on `npm start`. No local setup needed.

### Local (optional)

```bash
# 1. Install PostgreSQL locally
# 2. Update DATABASE_URL in apps/api/.env:
DATABASE_URL=postgresql://your-user:your-pass@localhost:5432/aismos

# 3. Run migrations
npm run db:migrate
```

---

## 5. First Run

After `npm start`, open **http://localhost:3000**.

Create an account at the login page, or use the pre-seeded test user:
- **Email:** `test@aismos.com`
- **Password:** `test123`

### Verify Services

```bash
# API
curl http://localhost:4000/health

# Web
curl http://localhost:3000

# AI
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@aismos.com","password":"test123"}'
```

---

## 6. Known Service Behaviors

| Service | When infra is missing | Behavior |
|---|---|---|
| API | DB unreachable | Crashes on first query. Fix `DATABASE_URL`. |
| Workers | Redis unavailable | Runs in degraded mode. Scheduler still polls for scheduled posts every 60s. |
| AI | Qdrant unavailable | Starts in degraded mode. Vector memory features disabled; text generation works. |
| AI | LLM API key missing | Returns mock/simulated responses. |

---

## 7. Common Tasks

```bash
# Regenerate Prisma client after schema changes
npm run prisma:generate

# Create a new migration
cd apps/api && npx prisma migrate dev --name describe-change

# Reset database (drops all data)
cd apps/api && npx prisma migrate reset --force

# Type-check all TypeScript
npm run typecheck

# Format code
npm run format

# Run tests
npm test
```

---

## 8. Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE` on port 3000/4000/8000 | Old process still bound to port | `node scripts/kill-ports.mjs` then restart |
| Login returns 500 | `ENCRYPTION_SECRET` missing | Add `ENCRYPTION_SECRET` to `apps/api/.env` |
| Login returns 401 | Wrong credentials | Register first, or check email/password |
| AI: `ModuleNotFoundError: No module named 'qdrant_client'` | System Python missing `qdrant-client` | `python -m pip install qdrant-client` |
| `ERR_MODULE_NOT_FOUND` | Shared package not built | `npm run build:shared` |
| Workers `ECONNREFUSED :6379` | Redis not running | Safe — workers run in degraded mode |
| AI Qdrant connection error | Qdrant not running | Safe — AI runs in degraded mode |
| `prisma:error` pool timeout | Remote DB slow | Wait and retry, or increase `pool_timeout` in `DATABASE_URL` |
| `npm start` fails with quoting errors | Windows shell in old start script | Already fixed — uses `npm run dev:all` |
