import { Router, type RequestHandler } from "express";
import { index, show, create, update, updateStatus, remove, publish } from "../controllers/post-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const postRouter = Router();

postRouter.get("/workspaces/:workspaceId/posts", ...requireWorkspaceAuth(), asyncRoute(index));
postRouter.get("/workspaces/:workspaceId/posts/:postId", ...requireWorkspaceAuth(), asyncRoute(show));
postRouter.post("/workspaces/:workspaceId/posts", ...requireWorkspaceAuth(), asyncRoute(create));
postRouter.patch("/workspaces/:workspaceId/posts/:postId", ...requireWorkspaceAuth(), asyncRoute(update));
postRouter.patch("/workspaces/:workspaceId/posts/:postId/status", ...requireWorkspaceAuth(), asyncRoute(updateStatus));
postRouter.post("/workspaces/:workspaceId/posts/:postId/publish", ...requireWorkspaceAuth(), asyncRoute(publish));
postRouter.delete("/workspaces/:workspaceId/posts/:postId", ...requireWorkspaceAuth(), asyncRoute(remove));
