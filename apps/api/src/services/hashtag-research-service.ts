import { ApiError } from "../utils/api-error.js";
import { env } from "../config.js";

const AI_URL = env.aiServiceUrl;

async function callAi<T>(path: string, body: unknown): Promise<T> {
  const url = `${AI_URL}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, "ai_service_error", `AI service error (${path}): ${text}`);
  }
  return response.json() as Promise<T>;
}

export interface HashtagAnalysis {
  hashtag: string;
  volume_estimate: string;
  competition_level: string;
  trend_direction: string;
  relevance_score: number;
  recommendation: string;
}

export interface HashtagResearchResult {
  analyses: HashtagAnalysis[];
  recommended: string[];
  avoid: string[];
  rationale: string;
}

export interface HashtagPool {
  primary: string[];
  secondary: string[];
  niche: string[];
  branded: string[];
  seasonal: string[];
}

export interface HashtagRechargeResult {
  pool: HashtagPool;
  deprecated: string[];
  rationale: string;
}

export async function researchHashtags(input: {
  hashtags: string[];
  topic: string;
  platform: string;
  industry?: string;
  brand_id?: string;
}): Promise<HashtagResearchResult> {
  return callAi<HashtagResearchResult>("/research/hashtags", input);
}

export async function rechargeHashtags(input: {
  brand_id: string;
  platform: string;
  current_hashtags?: string[];
  topic?: string;
  count?: number;
}): Promise<HashtagRechargeResult> {
  return callAi<HashtagRechargeResult>("/research/hashtags/recharge", input);
}
