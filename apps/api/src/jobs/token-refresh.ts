import type pino from "pino";
import { refreshExpiringMetaTokens } from "../services/social-account-service.js";

const twelveHoursMs = 12 * 60 * 60 * 1000;

export function startMetaTokenRefreshJob(logger: pino.Logger): void {
  const run = async () => {
    try {
      const result = await refreshExpiringMetaTokens();
      logger.info(result, "Meta token refresh job completed");
    } catch (error) {
      logger.error({ error }, "Meta token refresh job failed");
    }
  };

  setInterval(() => {
    void run();
  }, twelveHoursMs);

  void run();
}
