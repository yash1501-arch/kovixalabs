import { prisma } from "../db.js";

const db = prisma as any;

export async function listWebhooks(workspaceId: string) {
  return db.webhook.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
}

export async function getWebhook(webhookId: string, workspaceId: string) {
  return db.webhook.findFirst({ where: { id: webhookId, workspaceId } });
}

export async function createWebhook(data: {
  workspaceId: string;
  url: string;
  events: string[];
  secret?: string;
  enabled?: boolean;
  description?: string;
}) {
  return db.webhook.create({ data });
}

export async function updateWebhook(webhookId: string, workspaceId: string, data: {
  url?: string;
  events?: string[];
  secret?: string;
  enabled?: boolean;
  description?: string;
}) {
  const existing = await db.webhook.findFirst({ where: { id: webhookId, workspaceId } });
  if (!existing) return null;
  return db.webhook.update({ where: { id: webhookId }, data });
}

export async function deleteWebhook(webhookId: string, workspaceId: string) {
  const existing = await db.webhook.findFirst({ where: { id: webhookId, workspaceId } });
  if (!existing) return false;
  await db.webhook.delete({ where: { id: webhookId } });
  return true;
}

export async function triggerWebhookEvent(workspaceId: string, event: string, payload: Record<string, unknown>) {
  const webhooks = await db.webhook.findMany({
    where: { workspaceId, enabled: true, events: { has: event } },
  });

  const results = await Promise.allSettled(
    webhooks.map(async (wh: any) => {
      try {
        const body = JSON.stringify({ event, workspaceId, payload, timestamp: new Date().toISOString() });
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (wh.secret) headers["X-Webhook-Signature"] = wh.secret;
        const resp = await fetch(wh.url, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) });
        await db.webhook.update({
          where: { id: wh.id },
          data: { lastTriggeredAt: new Date(), lastStatus: String(resp.status) },
        });
      } catch (e: any) {
        await db.webhook.update({
          where: { id: wh.id },
          data: { lastTriggeredAt: new Date(), lastStatus: `error: ${e?.message ?? "unknown"}` },
        });
      }
    })
  );

  return {
    total: webhooks.length,
    succeeded: results.filter(r => r.status === "fulfilled").length,
  };
}

export async function testWebhook(wh: { url: string; secret?: string }) {
  const body = JSON.stringify({
    event: "TEST_EVENT",
    workspaceId: "test",
    payload: { message: "This is a test webhook from AISMOS." },
    timestamp: new Date().toISOString(),
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (wh.secret) headers["X-Webhook-Signature"] = wh.secret;

  const start = Date.now();
  try {
    const resp = await fetch(wh.url, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) });
    const elapsed = Date.now() - start;
    return { success: resp.ok, status: resp.status, elapsed_ms: elapsed, error: null };
  } catch (e: any) {
    return { success: false, status: 0, elapsed_ms: Date.now() - start, error: e?.message ?? "unknown error" };
  }
}
