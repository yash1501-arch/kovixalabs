import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { globalErrorHandler } from "../middleware/error-handler.js";
import { requestIdMiddleware } from "../middleware/request-id.js";
import { ApiError } from "../utils/api-error.js";
import { ZodError, z } from "zod";

function appWithError() {
  const app = express();
  app.use(requestIdMiddleware);
  app.get("/error", (_req, _res, next) => next(new ApiError(403, "forbidden", "Access denied")));
  app.use(globalErrorHandler);
  return app;
}

describe("globalErrorHandler", () => {
  it("formats ApiError correctly", async () => {
    const res = await request(appWithError()).get("/error");
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, error: "forbidden", message: "Access denied" });
    expect(res.body).toHaveProperty("requestId");
  });

  it("formats ZodError correctly", async () => {
    const schema = z.object({ name: z.string().min(1) });
    let zodError: ZodError | null = null;
    try { schema.parse({ name: "" }); } catch (e) { zodError = e as ZodError; }

    const app = express();
    app.use(requestIdMiddleware);
    app.get("/error", (_req, _res, next) => next(zodError));
    app.use(globalErrorHandler);
    const res = await request(app).get("/error");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("validation_error");
    expect(res.body.issues).toBeInstanceOf(Array);
    expect(res.body.issues[0]).toHaveProperty("path");
    expect(res.body.issues[0]).toHaveProperty("message");
    expect(res.body).toHaveProperty("requestId");
  });

  it("formats unknown errors as 500", async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.get("/error", (_req, _res, next) => next(new Error("boom")));
    app.use(globalErrorHandler);
    const res = await request(app).get("/error");
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, error: "internal_server_error" });
    expect(res.body).toHaveProperty("requestId");
  });
});
