import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { createAuthTokens } from "../utils/jwt.js";
import { randomUUID } from "node:crypto";

const app = createApp();
const testUserId = "int-test-" + randomUUID().slice(0, 8);
const testWorkspaceId = "ws-int-" + randomUUID().slice(0, 8);
const testBrandId = "brand-int-" + randomUUID().slice(0, 8);
let accessToken: string;
let createdCampaignId: string;
let createdConfigId: string;
let createdDatasetId: string;

beforeAll(() => {
  const tokens = createAuthTokens(testUserId, testWorkspaceId, "owner", "int@test.com", "Integration Test User");
  accessToken = tokens.accessToken;
});

describe("POST /api/auth/register", () => {
  it("validates input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("validation_error");
  });

  it("validates email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "notanemail", password: "123456" });
    expect(res.status).toBe(400);
  });

  it("validates password length", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@test.com", password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("validates body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
  });
});

describe("Auth enforcement on protected routes", () => {
  it("POST .../campaigns returns 401 without token", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/campaigns`)
      .send({ brandId: testBrandId, platform: "instagram", objective: "awareness", budget: 1000, durationDays: 7, targetAudience: "test" });
    expect(res.status).toBe(401);
  });

  it("POST .../autopilot returns 401 without token", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/autopilot`)
      .send({ brandId: testBrandId, platforms: ["instagram"], postsPerWeek: 3 });
    expect(res.status).toBe(401);
  });

  it("POST .../swarm/dispatch returns 401 without token", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/swarm/dispatch`)
      .send({ type: "content_week", brandId: testBrandId });
    expect(res.status).toBe(401);
  });
});

describe("Workspace endpoints (read-only, optionalAuth)", () => {
  it("GET .../campaigns returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/campaigns`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../analytics returns 200", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/analytics?period=30d`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalPosts");
    expect(res.body).toHaveProperty("totalImpressions");
  });

  it("GET .../stats returns 200 with dashboard stats", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/stats`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("brands");
    expect(res.body).toHaveProperty("connectedAccounts");
  });

  it("GET .../trends returns 200 with trends array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/trends`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../image-prompts returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/image-prompts`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../swarm/tasks returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/swarm/tasks`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../video-scripts returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/video-scripts`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../music-suggestions returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/music-suggestions`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../autopilot returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/autopilot`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../learning/insights returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/learning/insights`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../finetune/datasets returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/finetune/datasets`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../finetune/jobs returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/finetune/jobs`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../finetune/models returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/finetune/models`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../mlops/models returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/mlops/models`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET .../mlops/experiments returns 200 with array", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/mlops/experiments`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Workspace endpoints (without auth token)", () => {
  it("GET .../trends works with optionalAuth (no token)", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/trends`);
    expect(res.status).toBe(200);
  });

  it("GET .../analytics works with optionalAuth (no token)", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/analytics?period=7d`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalPosts");
  });
});

describe("Validation error handling", () => {
  it("POST .../campaigns validates body", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/campaigns`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST .../autopilot validates body", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/autopilot`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST .../swarm/dispatch validates body", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/swarm/dispatch`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("Enterprise endpoints (paginated + envelope)", () => {
  it("GET .../team returns paginated members", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/team?page=1&limit=2`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2 });
    expect(res.body.meta).toHaveProperty("total");
    expect(res.body.meta).toHaveProperty("totalPages");
  });

  it("GET .../billing returns envelope", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/billing`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("plan");
    expect(res.body.data).toHaveProperty("status", "active");
  });

  it("GET .../usage returns envelope", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/usage`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("posts");
    expect(res.body.data).toHaveProperty("aiGenerations");
  });

  it("GET .../audit-logs returns paginated logs", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${testWorkspaceId}/audit-logs?page=1&limit=5`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty("page");
    expect(res.body.meta).toHaveProperty("total");
  });
});
