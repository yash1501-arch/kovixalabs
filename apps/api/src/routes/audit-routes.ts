import { Router, type RequestHandler } from "express";
import { auditBrand } from "../controllers/audit-controller.js";
import { requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const auditRouter = Router();

auditRouter.post("/workspaces/:workspaceId/brands/:brandId/audit", requireAuth, asyncRoute(auditBrand));
