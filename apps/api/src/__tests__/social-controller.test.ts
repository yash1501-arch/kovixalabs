import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { socialRouter } from "../routes/social-routes.js";
import { createAuthTokens } from "../utils/jwt.js";

const { listConnectedAccountsMock } = vi.hoisted(() => ({
  listConnectedAccountsMock: vi.fn()
}));

vi.mock("../services/social-account-service.js", async () => {
  const actual = await vi.importActual<typeof import("../services/social-account-service.js")>("../services/social-account-service.js");
  return {
    ...actual,
    listConnectedAccounts: listConnectedAccountsMock,
    disconnectSocialAccount: vi.fn()
  };
});

describe("GET /v1/workspaces/:workspaceId/social-accounts", () => {
  beforeEach(() => {
    listConnectedAccountsMock.mockReset();
  });

  it("returns connected accounts as an array for the current workspace", async () => {
    listConnectedAccountsMock.mockResolvedValue([
      {
        id: "account-1",
        userId: "user-1",
        workspaceId: "ws-1",
        platform: "linkedin",
        platformUserId: "linkedin-1",
        username: null,
        handle: "@acme",
        displayName: "Acme Studio",
        avatarUrl: null,
        connected: true,
        connectedAt: new Date().toISOString(),
        followerCount: 1200,
        tokenExpiresAt: null,
        scopes: ["r_liteprofile"],
        metadata: null
      }
    ]);

    const app = express();
    app.use("/v1", socialRouter);

    const token = createAuthTokens("user-1", "ws-1", "owner", "owner@example.com", "Owner");
    const res = await request(app)
      .get("/v1/workspaces/ws-1/social-accounts")
      .set("Authorization", `Bearer ${token.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ handle: "@acme", workspaceId: "ws-1" });
  });
});
