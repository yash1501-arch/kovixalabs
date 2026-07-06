import { Router, type RequestHandler } from "express";
import {
  previewBrand,
  index,
  create,
  show,
  update,
  listMemory,
  createMemory,
  searchMemory,
  destroyMemory,
  ingestDocument,
  summarizeDocument,
} from "../controllers/brand-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const brandRouter = Router();

brandRouter.post("/preview", asyncRoute(previewBrand));
brandRouter.get("/workspaces/:workspaceId/brands", ...requireWorkspaceAuth(), asyncRoute(index));
brandRouter.post("/workspaces/:workspaceId/brands", ...requireWorkspaceAuth(), asyncRoute(create));
brandRouter.get("/brands/:brandId", optionalAuth, asyncRoute(show));
brandRouter.put("/brands/:brandId/profile", requireAuth, asyncRoute(update));
brandRouter.get("/brands/:brandId/memory", optionalAuth, asyncRoute(listMemory));
brandRouter.post("/brands/:brandId/memory", requireAuth, asyncRoute(createMemory));
brandRouter.post("/brands/:brandId/memory/search", optionalAuth, asyncRoute(searchMemory));
brandRouter.delete("/brands/:brandId/memory/:entryId", requireAuth, asyncRoute(destroyMemory));
brandRouter.post("/brands/:brandId/documents/ingest", requireAuth, asyncRoute(ingestDocument));
brandRouter.post("/brands/:brandId/documents/summarize", requireAuth, asyncRoute(summarizeDocument));
