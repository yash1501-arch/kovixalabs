import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth } from "../middleware/auth.js";
import { handleGenerateCopy } from "../controllers/copy-controller.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

export const copyRouter = Router();
copyRouter.post("/ai/copy", requireAuth, asyncRoute(handleGenerateCopy));
