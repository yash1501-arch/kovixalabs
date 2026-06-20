import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error.js";

export function globalErrorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    res.status(400).json({
      success: false,
      error: "validation_error",
      message: "Request validation failed.",
      issues,
      requestId: req.requestId,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: "internal_server_error",
    message: "Unexpected API error.",
    requestId: req.requestId,
  });
}
