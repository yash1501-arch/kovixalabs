import { Router, type RequestHandler } from "express";
import { requireWorkspaceAuth } from "../middleware/rbac.js";
import { chatWithModel, generateVoiceover, generateSubtitles, researchHashtags, rechargeHashtags, analyzeEngagement, generateBatchContent, generateMusic, analyzeVideoFaceSwap, renderVideo, generateHashtags, ingestDocument, summarizeDocument, analyzeFaceEnhancement } from "../services/ai-client.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const aiProxyRouter = Router();

aiProxyRouter.post("/workspaces/:workspaceId/chat", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { messages, model, temperature, maxTokens } = req.body;
  const result = await chatWithModel({
    messages,
    model: model ?? undefined,
    temperature: temperature ?? undefined,
    max_tokens: maxTokens ?? undefined,
    workspaceId,
  });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/generate/voiceover", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { text, voice, speed, format } = req.body;
  const result = await generateVoiceover({ text, voice, speed, format, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/generate/subtitles", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { scenes, format, maxLineLength } = req.body;
  const result = await generateSubtitles({ scenes, format, max_line_length: maxLineLength, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/research/hashtags", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { hashtags, topic, platform, industry, brandId } = req.body;
  const result = await researchHashtags({ hashtags, topic, platform, industry, brand_id: brandId, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/research/hashtags/recharge", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { brandId, platform, currentHashtags, topic, count } = req.body;
  const result = await rechargeHashtags({ brand_id: brandId, platform, current_hashtags: currentHashtags, topic, count, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/research/engagement", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { brandId, platform, records } = req.body;
  const result = await analyzeEngagement({ brand_id: brandId, platform, records, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/generate/batch", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { brandId, platform, topic, objective, tone, generateImages, generateVideoScript, variantCount } = req.body;
  const result = await generateBatchContent({
    brand_id: brandId, platform, topic, objective, tone,
    generate_images: generateImages, generate_video_script: generateVideoScript,
    variant_count: variantCount, workspaceId,
  });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/generate/music", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { genre, mood, durationSeconds, style, prompt } = req.body;
  const result = await generateMusic({ genre, mood, duration_seconds: durationSeconds, style, prompt, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/face-swap/video-analyze", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { sourceFaceUrl, targetVideoUrl, brandContext } = req.body;
  const result = await analyzeVideoFaceSwap({ sourceFaceUrl, targetVideoUrl, brandContext, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/generate/render", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { title, scenes, cta, hashtags } = req.body;
  const result = await renderVideo({ title, scenes, cta, hashtags, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/generate/hashtags", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { brandId, platform, topic, caption } = req.body;
  const result = await generateHashtags({ brandId, platform, topic, caption, workspaceId });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/documents/ingest", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { brandId, title, content, source, chunkSize, overlap } = req.body;
  const result = await ingestDocument({ workspace_id: workspaceId as string, brand_id: brandId, title, content, source, chunk_size: chunkSize, overlap });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/documents/summarize", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { brandId, title, content } = req.body;
  const result = await summarizeDocument({ workspace_id: workspaceId as string, brand_id: brandId, title, content });
  res.json(result);
}));

aiProxyRouter.post("/workspaces/:workspaceId/face/enhance", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const { workspaceId } = req.params;
  const { imageUrl, style, brandContext } = req.body;
  const result = await analyzeFaceEnhancement({ imageUrl, style, brandContext, workspaceId });
  res.json(result);
}));
