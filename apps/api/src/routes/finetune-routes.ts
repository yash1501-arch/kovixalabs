import { Router, type RequestHandler } from "express";
import { listDatasets, createDataset, deleteDataset, listJobs, createJob, listModels, deployModel } from "../controllers/finetune-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const finetuneRouter = Router();

finetuneRouter.get("/workspaces/:workspaceId/finetune/datasets", optionalAuth, asyncRoute(listDatasets));
finetuneRouter.post("/workspaces/:workspaceId/finetune/datasets", requireAuth, asyncRoute(createDataset));
finetuneRouter.delete("/workspaces/:workspaceId/finetune/datasets/:datasetId", requireAuth, asyncRoute(deleteDataset));
finetuneRouter.get("/workspaces/:workspaceId/finetune/jobs", optionalAuth, asyncRoute(listJobs));
finetuneRouter.post("/workspaces/:workspaceId/finetune/jobs", requireAuth, asyncRoute(createJob));
finetuneRouter.get("/workspaces/:workspaceId/finetune/models", optionalAuth, asyncRoute(listModels));
finetuneRouter.post("/workspaces/:workspaceId/finetune/models/:modelId/deploy", requireAuth, asyncRoute(deployModel));
