# Plan: Remove Mock Data — Real Prisma for All Controllers

## Goals
1. Replace all 9 demo-only controllers with Prisma-backed services
2. Remove the demo store entirely
3. Clean up server.ts (remove 80 duplicated v1 inline handlers)
4. Apply auth middleware consistently

## Current State
- **31 Prisma models** exist — covers every domain
- **5 controllers already Prisma-backed**: auth, brand, post, content-plan, social
- **9 controllers are demo-only**: campaign, enterprise, swarm, trend, video-music, autopilot, learning, finetune, mlops
- **`demoStore`** has 28 Maps — all directly read/written by demo-only controllers
- **`server.ts`** has 80 inline `/v1/` route handlers duplicating the modular pattern

## Implementation Plan

### Phase 1: Create Prisma Service Files (9 new files)
For each demo-only domain, create a `services/*-service.ts` with Prisma CRUD.

| Domain | Prisma Model(s) | Service File |
|--------|----------------|-------------|
| Campaign | `AdCampaign`, `AdVariant` | `campaign-service.ts` |
| Enterprise | `TeamMember`, `AuditLog` | `enterprise-service.ts` |
| Swarm | `SwarmTask`, `SwarmAgent` | `swarm-service.ts` |
| Trend | `Trend`, `ImagePrompt` | `trend-service.ts` |
| Video/Music | `VideoScript`, `MusicSuggestion` | `video-music-service.ts` |
| Autopilot | `AutopilotConfig`, `AutopilotRun` | `autopilot-service.ts` |
| Learning | `LearningInsight`, `LearningProfile` | `learning-service.ts` |
| Finetune | `FinetuneDataset`, `FinetuneJob`, `FinetunedModel` | `finetune-service.ts` |
| MLOps | `MlopsModel`, `Experiment` | `mlops-service.ts` |

Each service exports the same function signatures the controller already expects.

### Phase 2: Update Controllers → Use New Services
Each controller currently reads `demoStore.*` directly. Replace with async service calls.

### Phase 3: Remove demoStore
After all controllers are migrated:
1. Delete `demo-store.ts`
2. Remove `withDemoFallback` from brand-service, post-service, content-plan-service, social-helper
3. Remove demo fallback from auth-service/controller

### Phase 4: Clean up server.ts
1. Remove all 80 inline `/v1/` route handlers
2. Remove the 29 serializer functions (unnecessary once all data goes through Prisma)
3. Remove helper functions duplicated in services
4. Remove the `demoStore` instantiation

### Phase 5: Auth Middleware on All Routes
Add `optionalAuth` or `requireAuth` to remaining route files that lack it.

## Verification
- `npm test` — all 39+ existing tests pass
- `npm run typecheck` — no TS errors in new service files
- New tests added for each created service
