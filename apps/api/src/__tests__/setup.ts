import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.ENCRYPTION_SECRET = "test-secret-that-is-at-least-32-chars-long-for-hmac-sha256";
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-chars-long-for-hmac-sha256";
});

afterAll(() => {
  // cleanup
});
