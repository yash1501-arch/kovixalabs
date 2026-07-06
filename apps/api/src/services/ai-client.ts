import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";
import { getWorkspaceDefaultModel } from "./llm-model-helper.js";
import type { ModelOverride } from "./llm-model-helper.js";

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

async function callAiWithModel<T>(path: string, body: Record<string, unknown>, workspaceId: string): Promise<T> {
  const override = await getWorkspaceDefaultModel(workspaceId);
  if (override) {
    body.model_override = override;
  }
  return callAi<T>(path, body);
}

export { callAi, callAiWithModel };
export type { ModelOverride };

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

export async function scrapeNews(url: string, maxArticles = 20): Promise<{
  source_url: string;
  articles: Array<{ title: string; url: string; content?: string; summary?: string; author?: string; published_at?: string; image_url?: string }>;
}> {
  return callAi("/news/scrape", { url, max_articles: maxArticles });
}

export async function analyzeNews(input: {
  articles: Array<{ title: string; url: string; content?: string; summary?: string; author?: string; published_at?: string; image_url?: string }>;
  brand_context?: string;
}): Promise<{
  analyses: Array<{ url: string; title: string; summary: string; keywords: string[]; relevance_score: number; sentiment: string }>;
}> {
  return callAi("/news/analyze", input);
}

export async function analyzeFaceSwap(input: {
  sourceImageUrl: string;
  targetImageUrl: string;
  brandContext?: string;
}): Promise<{
  compatible: boolean;
  confidence: number;
  recommendations: string[];
  parameters: Record<string, unknown>;
}> {
  return callAi("/face-swap/analyze", {
    source_image_url: input.sourceImageUrl,
    target_image_url: input.targetImageUrl,
    brand_context: input.brandContext,
  });
}

export async function ingestDocument(input: {
  workspace_id: string;
  brand_id: string;
  title: string;
  content: string;
  source?: string;
  chunk_size?: number;
  overlap?: number;
}): Promise<{
  status: string;
  chunks_created: number;
  chunks: Array<{ entry_id: string; title: string; content: string; tags: string[] }>;
}> {
  return callAi("/documents/ingest", input);
}

export async function summarizeDocument(input: {
  workspace_id: string;
  brand_id: string;
  title: string;
  content: string;
}): Promise<{
  summary: string;
  key_points: string[];
  brand_relevance: string;
  suggested_tags: string[];
}> {
  return callAi("/documents/summarize", input);
}

export async function researchSocialProfile(input: {
  platform: string;
  display_name: string;
  username?: string;
  follower_count?: number;
  bio?: string;
  description?: string;
  media_count?: number;
  video_count?: number;
  view_count?: number;
  website?: string;
}): Promise<{
  profile_summary: string;
  audience_description: string;
  content_themes: string[];
  suggested_brand_voice: string;
  suggested_hashtags: string[];
  insights: Array<{ category: string; finding: string }>;
}> {
  return callAi("/research/social-profile", input);
}

export async function generateVideoScript(input: {
  brand_id: string;
  platform: string;
  topic: string;
  style?: string;
  duration_seconds: number;
  cta?: string;
}): Promise<{
  task_id: string;
  title: string;
  hook: string;
  scenes: Array<{
    scene_number: number;
    duration_seconds: number;
    visual_description: string;
    spoken_text: string;
    on_screen_text?: string;
  }>;
  cta: string;
  hashtags: string[];
}> {
  return callAi("/generate/video-scripts", input);
}

export async function executeSwarmTask(input: {
  task_id: string;
  task_type: string;
  agents: Array<{ agent_id: string; role: string; action: string }>;
  brand_context?: string;
  brand_memory?: string[];
  platform?: string;
}): Promise<{
  task_id: string;
  task_type: string;
  agent_count: number;
  completed_count: number;
  agents: Array<{ agent_id: string; role: string; status: string; result: string; details: string }>;
}> {
  return callAi("/swarm/execute", input);
}

export async function generateImages(input: {
  brand_id: string;
  prompt: string;
  style?: string;
  aspect_ratio?: string;
  count?: number;
  workspaceId?: string;
}): Promise<{ task_id: string; images: string[] }> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/images", {
      brand_id: input.brand_id,
      prompt: input.prompt,
      style: input.style,
      aspect_ratio: input.aspect_ratio ?? "1:1",
      count: input.count ?? 1,
    }, input.workspaceId);
  }
  return callAi("/generate/images", {
    brand_id: input.brand_id,
    prompt: input.prompt,
    style: input.style,
    aspect_ratio: input.aspect_ratio ?? "1:1",
    count: input.count ?? 1,
  });
}

export async function createFinetuneJob(input: {
  workspace_id: string;
  brand_id: string;
  job_name: string;
  base_model: string;
  training_data?: Array<{ prompt: string; completion: string }>;
  epochs?: number;
  workspaceId?: string;
}): Promise<{
  job_id: string;
  status: string;
  job_name: string;
  base_model: string;
  trained_model: string;
  epochs: number;
  estimated_duration_seconds: number;
  model_override_used: boolean;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/finetune/jobs", {
      workspace_id: input.workspace_id,
      brand_id: input.brand_id,
      job_name: input.job_name,
      base_model: input.base_model,
      training_data: input.training_data ?? [],
      epochs: input.epochs ?? 3,
    }, input.workspaceId);
  }
  return callAi("/finetune/jobs", {
    workspace_id: input.workspace_id,
    brand_id: input.brand_id,
    job_name: input.job_name,
    base_model: input.base_model,
    training_data: input.training_data ?? [],
    epochs: input.epochs ?? 3,
  });
}

export async function finetuneChat(input: {
  model_name: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  workspaceId?: string;
}): Promise<{ content: string; model: string }> {
  if (input.workspaceId) {
    return callAiWithModel("/finetune/chat", {
      model_name: input.model_name,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.max_tokens ?? 2048,
    }, input.workspaceId);
  }
  return callAi("/finetune/chat", {
    model_name: input.model_name,
    messages: input.messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.max_tokens ?? 2048,
  });
}

export async function getFinetuneJob(jobId: string): Promise<{
  job_id: string;
  status: string;
  job_name: string;
  base_model: string;
  trained_model: string;
  epochs: number;
  estimated_duration_seconds: number;
  model_override_used: boolean;
}> {
  return callAi(`/finetune/jobs/${jobId}`, {});
}

export async function chatWithModel(input: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  workspaceId?: string;
}): Promise<{ content: string; model: string }> {
  if (input.workspaceId) {
    return callAiWithModel("/models/chat", {
      messages: input.messages,
      model: input.model,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.max_tokens ?? 2048,
    }, input.workspaceId);
  }
  return callAi("/models/chat", {
    messages: input.messages,
    model: input.model,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.max_tokens ?? 2048,
  });
}

export async function generateVoiceover(input: {
  text: string;
  voice?: string;
  speed?: number;
  format?: string;
  workspaceId?: string;
}): Promise<{ task_id: string; audio_url: string; duration_seconds: number; format: string }> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/voiceover", {
      text: input.text,
      voice: input.voice ?? "nova",
      speed: input.speed ?? 1.0,
      format: input.format ?? "mp3",
    }, input.workspaceId);
  }
  return callAi("/generate/voiceover", {
    text: input.text,
    voice: input.voice ?? "nova",
    speed: input.speed ?? 1.0,
    format: input.format ?? "mp3",
  });
}

export async function generateSubtitles(input: {
  scenes: Array<{ scene_number: number; spoken_text: string; start_seconds: number; end_seconds: number }>;
  format?: string;
  max_line_length?: number;
  workspaceId?: string;
}): Promise<{ content: string; format: string; total_duration_seconds: number }> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/subtitles", {
      scenes: input.scenes,
      format: input.format ?? "srt",
      max_line_length: input.max_line_length ?? 42,
    }, input.workspaceId);
  }
  return callAi("/generate/subtitles", {
    scenes: input.scenes,
    format: input.format ?? "srt",
    max_line_length: input.max_line_length ?? 42,
  });
}

export async function researchHashtags(input: {
  hashtags?: string[];
  topic: string;
  platform: string;
  industry?: string;
  brand_id?: string;
  workspaceId?: string;
}): Promise<{
  analyses: Array<{ hashtag: string; volume_estimate: string; competition_level: string; trend_direction: string; relevance_score: number; recommendation: string }>;
  recommended: string[];
  avoid: string[];
  rationale: string;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/research/hashtags", {
      hashtags: input.hashtags ?? [],
      topic: input.topic,
      platform: input.platform,
      industry: input.industry,
      brand_id: input.brand_id,
    }, input.workspaceId);
  }
  return callAi("/research/hashtags", {
    hashtags: input.hashtags ?? [],
    topic: input.topic,
    platform: input.platform,
    industry: input.industry,
    brand_id: input.brand_id,
  });
}

export async function rechargeHashtags(input: {
  brand_id: string;
  platform: string;
  current_hashtags?: string[];
  topic?: string;
  count?: number;
  workspaceId?: string;
}): Promise<{
  pool: { primary: string[]; secondary: string[]; niche: string[]; branded: string[]; seasonal: string[] };
  deprecated: string[];
  rationale: string;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/research/hashtags/recharge", {
      brand_id: input.brand_id,
      platform: input.platform,
      current_hashtags: input.current_hashtags ?? [],
      topic: input.topic,
      count: input.count ?? 10,
    }, input.workspaceId);
  }
  return callAi("/research/hashtags/recharge", {
    brand_id: input.brand_id,
    platform: input.platform,
    current_hashtags: input.current_hashtags ?? [],
    topic: input.topic,
    count: input.count ?? 10,
  });
}

export async function analyzeEngagement(input: {
  brand_id: string;
  platform: string;
  records: Array<{ post_id: string; platform: string; likes: number; comments: number; shares: number; impressions: number; reach: number; saves: number; engagement_rate: number; posted_at: string }>;
  workspaceId?: string;
}): Promise<{
  insights: Array<{ category: string; title: string; detail: string; recommendation: string; confidence: number }>;
  optimal_posting_times: string[];
  top_performing_hashtags: string[];
  recommended_content_mix: string[];
}> {
  if (input.workspaceId) {
    return callAiWithModel("/research/engagement/analyze", {
      brand_id: input.brand_id,
      platform: input.platform,
      records: input.records,
    }, input.workspaceId);
  }
  return callAi("/research/engagement/analyze", {
    brand_id: input.brand_id,
    platform: input.platform,
    records: input.records,
  });
}

export async function generateBatchContent(input: {
  brand_id: string;
  platform: string;
  topic: string;
  objective?: string;
  tone?: string;
  generate_images?: boolean;
  generate_video_script?: boolean;
  variant_count?: number;
  workspaceId?: string;
}): Promise<{
  task_id: string;
  model: string;
  brand_id: string;
  platform: string;
  topic: string;
  variants: Array<{ id: string; caption: string; rationale: string; hashtags: string[]; image_url: string | null }>;
  video_script: any | null;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/batch", {
      brand_id: input.brand_id,
      platform: input.platform,
      topic: input.topic,
      objective: input.objective ?? "awareness",
      tone: input.tone,
      generate_images: input.generate_images ?? false,
      generate_video_script: input.generate_video_script ?? false,
      variant_count: input.variant_count ?? 3,
    }, input.workspaceId);
  }
  return callAi("/generate/batch", {
    brand_id: input.brand_id,
    platform: input.platform,
    topic: input.topic,
    objective: input.objective ?? "awareness",
    tone: input.tone,
    generate_images: input.generate_images ?? false,
    generate_video_script: input.generate_video_script ?? false,
    variant_count: input.variant_count ?? 3,
  });
}

export async function analyzeVideoFaceSwap(input: {
  sourceFaceUrl: string;
  targetVideoUrl: string;
  brandContext?: string;
  workspaceId?: string;
}): Promise<{
  compatible: boolean;
  confidence: number;
  recommendations: string[];
  parameters: Record<string, unknown>;
  estimated_processing_time_seconds: number;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/face-swap/video-analyze", {
      source_face_url: input.sourceFaceUrl,
      target_video_url: input.targetVideoUrl,
      brand_context: input.brandContext,
    }, input.workspaceId);
  }
  return callAi("/face-swap/video-analyze", {
    source_face_url: input.sourceFaceUrl,
    target_video_url: input.targetVideoUrl,
    brand_context: input.brandContext,
  });
}

export async function renderVideo(input: {
  title: string;
  scenes: Array<{ scene_number: number; duration_seconds: number; visual_description: string; spoken_text: string; on_screen_text?: string }>;
  cta?: string;
  hashtags?: string[];
  workspaceId?: string;
}): Promise<{
  task_id: string;
  status: string;
  video_url: string;
  error?: string;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/render", {
      title: input.title,
      scenes: input.scenes,
      cta: input.cta,
      hashtags: input.hashtags,
    }, input.workspaceId);
  }
  return callAi("/generate/render", {
    title: input.title,
    scenes: input.scenes,
    cta: input.cta,
    hashtags: input.hashtags,
  });
}

export async function analyzeFaceEnhancement(input: {
  imageUrl: string;
  style?: string;
  brandContext?: string;
  workspaceId?: string;
}): Promise<{
  task_id: string;
  enhancements: Array<{ type: string; description: string; intensity: number; priority: string }>;
  processing_parameters: Record<string, unknown>;
  estimated_time_seconds: number;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/face/enhance", {
      image_url: input.imageUrl,
      style: input.style ?? "natural",
      brand_context: input.brandContext,
    }, input.workspaceId);
  }
  return callAi("/face/enhance", {
    image_url: input.imageUrl,
    style: input.style ?? "natural",
    brand_context: input.brandContext,
  });
}

export async function generateHashtags(input: {
  brandId: string;
  platform: string;
  topic: string;
  caption?: string;
  workspaceId?: string;
}): Promise<{
  trending: string[];
  niche: string[];
  branded: string[];
}> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/hashtags", {
      brand_id: input.brandId,
      platform: input.platform,
      topic: input.topic,
      caption: input.caption,
    }, input.workspaceId);
  }
  return callAi("/generate/hashtags", {
    brand_id: input.brandId,
    platform: input.platform,
    topic: input.topic,
    caption: input.caption,
  });
}

export async function generateMusic(input: {
  genre: string;
  mood: string;
  duration_seconds?: number;
  style?: string;
  prompt?: string;
  workspaceId?: string;
}): Promise<{
  task_id: string;
  audio_url: string;
  title: string;
  genre: string;
  mood: string;
  duration_seconds: number;
}> {
  if (input.workspaceId) {
    return callAiWithModel("/generate/music", {
      genre: input.genre,
      mood: input.mood,
      duration_seconds: input.duration_seconds ?? 30,
      style: input.style,
      prompt: input.prompt,
    }, input.workspaceId);
  }
  return callAi("/generate/music", {
    genre: input.genre,
    mood: input.mood,
    duration_seconds: input.duration_seconds ?? 30,
    style: input.style,
    prompt: input.prompt,
  });
}
