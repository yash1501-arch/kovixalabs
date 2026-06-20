import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { createAuthTokens } from "../utils/jwt.js";
import { randomUUID } from "node:crypto";

const testUserId = "test-" + randomUUID().slice(0, 8);
const testWorkspaceId = "ws-test-" + randomUUID().slice(0, 8);

describe("requireAuth", () => {
  it("returns 401 when no token is provided", async () => {
    const app = express();
    app.get("/protected", requireAuth, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("missing_token");
  });

  it("calls next() with valid token", async () => {
    const tokens = createAuthTokens(testUserId, testWorkspaceId, "owner", "test@test.com", "Test User");

    const app = express();
    app.get("/protected", requireAuth, (req: any, res) => res.json({ userId: req.user?.id, email: req.user?.email }));
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(testUserId);
    expect(res.body.email).toBe("test@test.com");
  });

  it("returns 401 with malformed token", async () => {
    const app = express();
    app.get("/protected", requireAuth, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get("/protected").set("Authorization", "Bearer invalidtokenthatisnotvalid");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_token");
  });
});

describe("optionalAuth", () => {
  it("sets user when valid token is provided", async () => {
    const tokens = createAuthTokens(testUserId, testWorkspaceId, "member", "opt@test.com");

    const app = express();
    app.get("/public", optionalAuth, (req: any, res) => res.json({ userId: req.user?.id ?? null }));
    const res = await request(app).get("/public").set("Authorization", `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(testUserId);
  });

  it("does not fail when no token is provided", async () => {
    const app = express();
    app.get("/public", optionalAuth, (req: any, res) => res.json({ userId: req.user?.id ?? null }));
    const res = await request(app).get("/public");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });
});
