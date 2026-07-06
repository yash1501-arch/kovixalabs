import { Router, type RequestHandler } from "express";
import { auditBrand } from "../controllers/audit-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const auditRouter = Router();

auditRouter.post("/workspaces/:workspaceId/brands/:brandId/audit", ...requireWorkspaceAuth(), asyncRoute(auditBrand));
