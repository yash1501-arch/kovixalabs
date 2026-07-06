import { Router, type RequestHandler } from "express";
import { register, login, me, logout, refreshToken, forgotPassword, handleResetPassword, handleUpdateProfile, handleChangePassword, handleUpdateWorkspace } from "../controllers/auth-controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { env } from "../config.js";

const platformConnectMap: Record<string, string> = {
  facebook: "/api/social/facebook/connect",
  instagram: "/api/social/instagram/connect",
  "instagram-basic": "/api/social/instagram-basic/connect",
  linkedin: "/api/social/linkedin/connect",
  twitter: "/api/social/twitter/connect",
  x: "/api/social/twitter/connect",
  tiktok: "/api/social/tiktok/connect",
  youtube: "/api/social/youtube/connect",
};

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const authRouter = Router();

authRouter.post("/register", asyncRoute(register));
authRouter.post("/login", asyncRoute(login));
authRouter.post("/forgot-password", asyncRoute(forgotPassword));
authRouter.post("/reset-password", asyncRoute(handleResetPassword));
authRouter.get("/me", optionalAuth, asyncRoute(me));
authRouter.post("/refresh", asyncRoute(refreshToken));
authRouter.post("/logout", requireAuth, asyncRoute(logout));
authRouter.patch("/profile", requireAuth, asyncRoute(handleUpdateProfile));
authRouter.post("/change-password", requireAuth, asyncRoute(handleChangePassword));
authRouter.patch("/workspaces/:workspaceId", requireAuth, asyncRoute(handleUpdateWorkspace));

/* ── Frontend OAuth platform connect (redirects to real social route) ── */
authRouter.get("/platforms/:platform/connect", (req, res) => {
  const platform = req.params.platform as string;
  const realPath = platformConnectMap[platform];
  if (!realPath) {
    res.status(400).json({ success: false, error: "unknown_platform", message: `Unknown platform: ${platform}` });
    return;
  }
  const target = new URL(realPath, `http://localhost:${env.port}`);
  if (req.query.workspaceId) target.searchParams.set("workspaceId", req.query.workspaceId as string);
  if (req.query.userId) target.searchParams.set("userId", req.query.userId as string);
  res.redirect(target.toString());
});
