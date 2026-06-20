import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

const BASE_URL = env.aiServiceUrl;

async function callAi<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      response.status,
      "ai_service_error",
      `AI service error (${path}): ${text}`
    );
  }

  return response.json() as Promise<T>;
}

export async function ingestMemory(input: {
  entry_id: string;
  workspace_id: string;
  brand_id: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
}): Promise<{ status: string; entry_id: string }> {
  return callAi("/memory/ingest", input);
}

export async function deleteMemory(entry_id: string): Promise<{ status: string; entry_id: string }> {
  return callAi("/memory/delete", { entry_id });
}

export async function searchBrandMemory(input: {
  query: string;
  brand_id?: string;
  workspace_id?: string;
  limit?: number;
}): Promise<{ results: Array<{ id: string; title: string; content: string; tags: string[]; score: number }> }> {
  return callAi("/retrieve/brand-memory", input);
}

export async function generateCopy(input: {
  brandId: string;
  platform: string;
  objective: string;
  topic: string;
  toneOverride?: string;
  variants?: number;
}): Promise<{
  task_id: string;
  model: string;
  variants: Array<{ id: string; caption: string; rationale: string }>;
}> {
  return callAi("/generate/copy", {
    brand_id: input.brandId,
    platform: input.platform,
    objective: input.objective,
    topic: input.topic,
    tone: input.toneOverride ?? null,
    brand_memory: [],
    variants: input.variants ?? 3,
  });
}

export async function learnFromContent(input: {
  post_id: string;
  workspace_id: string;
  brand_id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  media_urls: string[];
  engagement: Record<string, unknown>;
  performance_score: number;
}): Promise<{ status: string; memory_entries_created: number; insights: string[] }> {
  return callAi("/memory/learn", input);
}
