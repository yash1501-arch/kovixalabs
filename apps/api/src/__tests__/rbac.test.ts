import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { requireRole, requireWorkspaceAccess } from "../middleware/rbac.js";

describe("requireRole", () => {
  it("returns 403 when user has insufficient role", async () => {
    const app = express();
    app.get("/admin", (req, _res, next) => {
      (req as any).user = { role: "viewer" };
      next();
    }, requireRole("admin"), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/admin");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });

  it("calls next when user has sufficient role", async () => {
    const app = express();
    app.get("/admin", (req, _res, next) => {
      (req as any).user = { role: "admin" };
      next();
    }, requireRole("admin"), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/admin");
    expect(res.status).toBe(200);
  });

  it("returns 401 when user is not authenticated", async () => {
    const app = express();
    app.get("/admin", requireRole("admin"), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/admin");
    expect(res.status).toBe(401);
  });
});

describe("requireWorkspaceAccess", () => {
  it("returns 403 when workspaceId does not match", async () => {
    const app = express();
    app.get("/workspace/:workspaceId/data", (req, _res, next) => {
      (req as any).user = { workspaceId: "other-ws" };
      next();
    }, requireWorkspaceAccess(), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/workspace/my-ws/data");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });

  it("calls next when workspaceId matches", async () => {
    const app = express();
    app.get("/workspace/:workspaceId/data", (req, _res, next) => {
      (req as any).user = { workspaceId: "my-ws" };
      next();
    }, requireWorkspaceAccess(), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/workspace/my-ws/data");
    expect(res.status).toBe(200);
  });
});
