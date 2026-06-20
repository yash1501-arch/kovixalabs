import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error.js";
import { generateVideoScript as generateScriptSvc, listVideoScripts as listScriptsSvc, deleteVideoScript as deleteScriptSvc, suggestMusic as suggestMusicSvc, listMusicSuggestions as listMusicSvc, deleteMusicSuggestion as deleteMusicSvc } from "../services/video-music-service.js";
import { prisma } from "../db.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const BrandParams = z.object({ brandId: z.string().min(1) });
const ScriptParams = z.object({ scriptId: z.string().min(1) });
const SuggestionParams = z.object({ suggestionId: z.string().min(1) });

const VideoScriptBody = z.object({
  platform: z.enum(["reels", "tiktok", "youtube_short", "youtube_long", "story"]),
  topic: z.string().min(1).max(200),
  duration: z.enum(["15", "30", "60", "90"]),
  style: z.enum(["educational", "entertaining", "promotional", "storytelling"]),
  workspaceId: z.string().min(1),
});

const MusicBody = z.object({
  workspaceId: z.string().min(1),
  platform: z.enum(["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"]),
  mood: z.enum(["energetic", "calm", "inspirational", "playful", "dramatic", "corporate"]),
  genre: z.enum(["pop", "hip-hop", "electronic", "acoustic", "cinematic", "jazz", "lo-fi"]).optional(),
});

export async function generateVideoScript(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const body = VideoScriptBody.parse(request.body);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  const brandName = brand?.name ?? "Brand";

  const result = await generateScriptSvc({
    workspaceId: body.workspaceId, brandId, platform: body.platform,
    topic: body.topic, duration: parseInt(body.duration, 10),
    style: body.style, brandName,
  });
  response.status(201).json(result);
}

export async function listVideoScripts(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const scripts = await listScriptsSvc(workspaceId);
  response.json(scripts);
}

export async function deleteVideoScript(request: Request, response: Response) {
  const { workspaceId, scriptId } = { ...WorkspaceParams.parse(request.params), ...ScriptParams.parse(request.params) };
  await deleteScriptSvc(scriptId, workspaceId);
  response.status(204).send();
}

export async function suggestMusic(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const body = MusicBody.parse(request.body);

  const result = await suggestMusicSvc({
    workspaceId: body.workspaceId, brandId, platform: body.platform,
    mood: body.mood, genre: body.genre ?? "mixed",
  });
  response.status(201).json(result);
}

export async function listMusicSuggestions(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const suggestions = await listMusicSvc(workspaceId);
  response.json(suggestions);
}

export async function deleteMusicSuggestion(request: Request, response: Response) {
  const { workspaceId, suggestionId } = { ...WorkspaceParams.parse(request.params), ...SuggestionParams.parse(request.params) };
  await deleteMusicSvc(suggestionId, workspaceId);
  response.status(204).send();
}
