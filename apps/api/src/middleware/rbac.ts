import { Request, Response, NextFunction } from "express";

export const ROLES = { viewer: 0, editor: 1, admin: 2, owner: 3 } as const;

type RoleName = keyof typeof ROLES;

export function requireRole(minimumRole: RoleName) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized", message: "Authentication required." });
      return;
    }

    const userLevel = ROLES[req.user.role as RoleName] ?? -1;
    const requiredLevel = ROLES[minimumRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({ error: "forbidden", message: `Requires role '${minimumRole}' or higher.` });
      return;
    }

    next();
  };
}

export function requireWorkspaceAccess(workspaceIdParam = "workspaceId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized", message: "Authentication required." });
      return;
    }

    const targetWorkspace = req.params[workspaceIdParam] || req.body[workspaceIdParam];
    if (targetWorkspace && targetWorkspace !== req.user.workspaceId) {
      res.status(403).json({ error: "forbidden", message: "Workspace access denied." });
      return;
    }

    next();
  };
}
