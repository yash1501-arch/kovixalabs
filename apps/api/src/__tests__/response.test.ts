import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { sendSuccess, sendPaginated } from "../utils/response.js";

function makeApp() {
  const app = express();
  app.get("/success", (_req, res) => sendSuccess(res, { id: 1, name: "test" }));
  app.get("/success-with-meta", (_req, res) => sendSuccess(res, [1, 2, 3], 200, { version: "1.0" }));
  app.get("/paginated", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    sendPaginated(res, ["a", "b", "c"], page, limit, 50);
  });
  app.get("/paginated-with-extra", (_req, res) => {
    sendPaginated(res, ["x"], 1, 10, 25, { filteredBy: "active" });
  });
  return app;
}

describe("sendSuccess", () => {
  it("wraps data in envelope", async () => {
    const res = await request(makeApp()).get("/success");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 1, name: "test" } });
  });

  it("includes optional meta", async () => {
    const res = await request(makeApp()).get("/success-with-meta");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toEqual({ version: "1.0" });
  });
});

describe("sendPaginated", () => {
  it("includes pagination meta", async () => {
    const res = await request(makeApp()).get("/paginated?page=2&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(["a", "b", "c"]);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 10, total: 50, totalPages: 5 });
  });

  it("handles extra meta", async () => {
    const res = await request(makeApp()).get("/paginated-with-extra");
    expect(res.body.meta.filteredBy).toBe("active");
  });
});
