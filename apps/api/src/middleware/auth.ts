import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  workspaceId: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing_token", message: "Authorization header with Bearer token required." });
    return;
  }

  const token = authHeader.slice(7);
  let payload;

  try {
    payload = verifyJwt(token);
  } catch {
    res.status(401).json({ error: "invalid_token", message: "JWT is invalid or expired." });
    return;
  }

  req.user = { id: payload.sub, email: payload.email, name: payload.name ?? null, role: payload.role, workspaceId: payload.workspaceId };
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name ?? null, role: payload.role, workspaceId: payload.workspaceId };
  } catch {
    // silently ignore invalid tokens for optional auth
  }
  next();
}
