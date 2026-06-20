import { Router, type RequestHandler } from "express";
import { index, create, updateStatus, remove, publish } from "../controllers/post-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const postRouter = Router();

postRouter.get("/workspaces/:workspaceId/posts", optionalAuth, asyncRoute(index));
postRouter.post("/workspaces/:workspaceId/posts", requireAuth, asyncRoute(create));
postRouter.patch("/workspaces/:workspaceId/posts/:postId/status", requireAuth, asyncRoute(updateStatus));
postRouter.post("/workspaces/:workspaceId/posts/:postId/publish", requireAuth, asyncRoute(publish));
postRouter.delete("/workspaces/:workspaceId/posts/:postId", requireAuth, asyncRoute(remove));
