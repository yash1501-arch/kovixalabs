import { Router, type RequestHandler } from "express";
import { requireWorkspaceAuth } from "../middleware/rbac.js";
import { generateImages, createFinetuneJob, getFinetuneJob } from "../services/ai-client.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const finetuneRouter = Router();

finetuneRouter.post("/workspaces/:workspaceId/finetune/jobs", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const workspaceId = req.params.workspaceId ?? "";
  const { brandId, jobName, baseModel, trainingData, epochs } = req.body;
  const result = await createFinetuneJob({
    workspace_id: workspaceId,
    brand_id: brandId,
    job_name: jobName,
    base_model: baseModel,
    training_data: trainingData,
    epochs,
    workspaceId,
  });
  res.json(result);
}));

finetuneRouter.get("/workspaces/:workspaceId/finetune/jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const result = await getFinetuneJob(req.params.jobId ?? "");
  res.json(result);
}));
