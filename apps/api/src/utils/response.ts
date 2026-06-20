import type { Response } from "express";

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ErrorEnvelope = {
  success: false;
  error: string;
  message: string;
  issues?: Array<{ path: string; message: string; code: string }>;
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  const body: SuccessEnvelope<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  extraMeta?: Record<string, unknown>,
) {
  const meta: PaginatedMeta & Record<string, unknown> = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
  if (extraMeta) Object.assign(meta, extraMeta);
  sendSuccess(res, data, 200, meta);
}
