# Plan: Wire `/v1/ai/copy` API Proxy Route

## Problem
Frontend calls `POST /v1/ai/copy` on Express API (port 4000), but no route exists.  
AI service has `POST /generate/copy` on Python service (port 8000).  
Need to bridge them via the Express API.

## Architecture
```
Frontend (port 3000)
  POST /v1/ai/copy
  → Express API (port 4000)
  → copy-controller.ts
  → copy-service.ts (maps fields, calls AI service)
  → Python AI Service (port 8000) POST /generate/copy
```

## Field Mapping

### Request (frontend → API → AI)
| Frontend sends | API maps to | AI expects |
|---|---|---|
| `brandId` | `brand_id` | `brand_id` |
| `platform` | `platform` | `platform` |
| `topic` | `topic` | `topic` |
| `objective` | `objective` | `objective` |
| `toneOverride` | `tone` | `tone` (optional) |
| `variants` | `variants` | `variants` (default 3) |
| — | `[]` | `brand_memory` (empty, AI will populate from Qdrant) |

### Response (AI → API → frontend)
| AI returns | API maps to | Frontend expects |
|---|---|---|
| `task_id` | `taskId` | `taskId` |
| `model` | `model` | `model` |
| `variants` | `variants` | `variants` |
| — | `brandId` (from request) | `brandId` |
| — | `workspaceId` (from JWT) | `workspaceId` |

## Implementation Steps

### 1. Add proxy function to `ai-client.ts`
Add `generateCopy()` function that:
- Receives `CopyGenerationRequest` (camelCase frontend shape)
- Maps fields to snake_case for AI service
- Calls `POST /generate/copy`
- Returns raw AI response (snake_case fields)

### 2. Create `copy-controller.ts`
One handler `handleGenerateCopy`:
- Extracts workspaceId from `req.user.workspaceId` (requires auth)
- Validates request body
- Calls `generateCopy()` service function
- Maps AI response back: `task_id` → `taskId`, injects `brandId`, `workspaceId`
- Returns `CopyGenerationResponse` JSON

Requires auth → frontend test will need auth headers.

### 3. Create `copy-routes.ts`
```typescript
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { handleGenerateCopy } from "../controllers/copy-controller.js";

export const copyRouter = Router();
copyRouter.post("/ai/copy", requireAuth, asyncRoute(handleGenerateCopy));
```

### 4. Mount in `app.ts`
```typescript
import { copyRouter } from "./routes/copy-routes.js";
// ...
app.use("/api", copyRouter);
app.use("/v1", copyRouter);
```

### 5. Fix frontend to send auth headers
In `content-studio-client.tsx`, `generateCopy()` should use `getAuthHeaders()` from `client-auth.ts`.

## Files to Modify
1. **`apps/api/src/services/ai-client.ts`** — add `generateCopy()` proxy
2. **`apps/api/src/controllers/copy-controller.ts`** — new file
3. **`apps/api/src/routes/copy-routes.ts`** — new file
4. **`apps/api/src/app.ts`** — import and mount copyRouter
5. **`apps/web/app/content/content-studio-client.tsx`** — add auth headers to fetch

## Verification
1. `npx tsc --noEmit --project apps/api/tsconfig.json` — zero errors
2. `npx tsc --noEmit --project apps/web/tsconfig.json` — zero errors
3. Start API + AI service, hit `/v1/ai/copy` with curl/Postman and valid JWT
