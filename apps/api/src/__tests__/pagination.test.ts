import { describe, it, expect } from "vitest";
import { parsePagination } from "../utils/pagination.js";

describe("parsePagination", () => {
  it("returns defaults for empty query", () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("parses page and limit", () => {
    const result = parsePagination({ page: "3", limit: "10" });
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it("caps limit at maxLimit", () => {
    const result = parsePagination({ limit: "999" }, { maxLimit: 50 });
    expect(result.limit).toBe(50);
  });

  it("enforces minimum page of 1", () => {
    const result = parsePagination({ page: "0" });
    expect(result.page).toBe(1);
  });

  it("enforces minimum limit of 1", () => {
    const result = parsePagination({ limit: "0" });
    expect(result.limit).toBe(1);
  });

  it("handles non-numeric fallback", () => {
    const result = parsePagination({ page: "abc", limit: "xyz" });
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("allows custom default limit", () => {
    const result = parsePagination({}, { defaultLimit: 50 });
    expect(result.limit).toBe(50);
  });
});
