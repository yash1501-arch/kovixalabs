export type PaginationInput = {
  page: number;
  limit: number;
  offset: number;
};

export type PaginationOptions = {
  maxLimit?: number;
  defaultLimit?: number;
};

export function parsePagination(query: Record<string, string | undefined>, opts?: PaginationOptions): PaginationInput {
  const maxLimit = opts?.maxLimit ?? 100;
  const defaultLimit = opts?.defaultLimit ?? 20;
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const rawLimit = parseInt(query.limit ?? String(defaultLimit), 10);
  const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
