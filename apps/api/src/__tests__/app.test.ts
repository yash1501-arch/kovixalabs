import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /health", () => {
  it("returns 200 with service status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: "api", status: "ok" });
    expect(res.body).toHaveProperty("timestamp");
  });
});

describe("auth-protected routes", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("request ID", () => {
  it("generates X-Request-Id header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("preserves client-provided X-Request-Id", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "client-id-123");
    expect(res.headers["x-request-id"]).toBe("client-id-123");
  });

  it("includes requestId in error responses", async () => {
    const res = await request(app).get("/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
  });
});

describe("404 handler", () => {
  it("returns envelope format for unknown routes", async () => {
    const res = await request(app).get("/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: "not_found" });
    expect(res.body).toHaveProperty("requestId");
  });
});
