import { Router, type RequestHandler } from "express";
import {
  callbackMeta,
  callbackLinkedIn,
  callbackTwitter,
  callbackTikTok,
  callbackYouTube,
  callbackInstagramBasic,
  connectMeta,
  connectLinkedInOAuth,
  connectTwitterOAuth,
  connectTikTokOAuth,
  connectYouTubeOAuth,
  connectInstagramBasic,
  disconnectAccount,
  listAccounts
} from "../controllers/social-controller.js";
import { auditSocialAccount } from "../controllers/audit-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const socialRouter = Router();

socialRouter.get("/facebook/connect", connectMeta("facebook"));
socialRouter.get("/facebook/callback", asyncRoute(callbackMeta("facebook")));

socialRouter.get("/instagram/connect", connectMeta("instagram"));
socialRouter.get("/instagram/callback", asyncRoute(callbackMeta("instagram")));

socialRouter.get("/instagram-basic/connect", connectInstagramBasic);
socialRouter.get("/instagram-basic/callback", asyncRoute(callbackInstagramBasic));

socialRouter.get("/linkedin/connect", connectLinkedInOAuth);
socialRouter.get("/linkedin/callback", asyncRoute(callbackLinkedIn));

socialRouter.get("/twitter/connect", connectTwitterOAuth);
socialRouter.get("/twitter/callback", asyncRoute(callbackTwitter));

socialRouter.get("/tiktok/connect", connectTikTokOAuth);
socialRouter.get("/tiktok/callback", asyncRoute(callbackTikTok));

socialRouter.get("/youtube/connect", connectYouTubeOAuth);
socialRouter.get("/youtube/callback", asyncRoute(callbackYouTube));

socialRouter.get("/accounts", requireAuth, asyncRoute(listAccounts));
socialRouter.delete("/disconnect/:id", requireAuth, asyncRoute(disconnectAccount));

/* ── Workspace-prefixed routes (frontend calls /v1/workspaces/:id/social-accounts) ── */
socialRouter.get("/workspaces/:workspaceId/social-accounts", ...requireWorkspaceAuth(), asyncRoute(listAccounts));
socialRouter.get("/workspaces/:workspaceId/social-accounts/:id/audit", ...requireWorkspaceAuth(), asyncRoute(auditSocialAccount));
socialRouter.delete("/workspaces/:workspaceId/social-accounts/:id", ...requireWorkspaceAuth(), asyncRoute(disconnectAccount));
