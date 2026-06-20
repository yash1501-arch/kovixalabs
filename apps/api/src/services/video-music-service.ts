import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import type { Prisma } from "@prisma/client";

export async function generateVideoScript(input: {
  workspaceId: string;
  brandId: string;
  platform: string;
  topic: string;
  duration: number;
  style: string;
  brandName: string;
}) {
  const scriptData = buildScript(input.topic, input.platform, input.duration, input.style, input.brandName);
  return prisma.videoScript.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      platform: input.platform,
      topic: input.topic,
      duration: input.duration,
      style: input.style,
      title: scriptData.title,
      hook: scriptData.hook,
      scenes: scriptData.scenes,
      cta: scriptData.cta,
      hashtags: scriptData.hashtags,
    },
  });
}

export async function listVideoScripts(workspaceId: string) {
  return prisma.videoScript.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteVideoScript(scriptId: string, workspaceId: string) {
  const script = await prisma.videoScript.findUnique({ where: { id: scriptId } });
  if (!script || script.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Script not found.");
  await prisma.videoScript.delete({ where: { id: scriptId } });
}

export async function suggestMusic(input: {
  workspaceId: string;
  brandId: string;
  platform: string;
  mood: string;
  genre: string;
}) {
  const tracks = musicLibrary[input.mood] ?? musicLibrary.energetic;
  return prisma.musicSuggestion.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      platform: input.platform,
      mood: input.mood,
      genre: input.genre,
      tracks: tracks as Prisma.InputJsonValue,
    },
  });
}

export async function listMusicSuggestions(workspaceId: string) {
  return prisma.musicSuggestion.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteMusicSuggestion(suggestionId: string, workspaceId: string) {
  const suggestion = await prisma.musicSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion || suggestion.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Suggestion not found.");
  await prisma.musicSuggestion.delete({ where: { id: suggestionId } });
}

function buildScript(topic: string, platform: string, durationSec: number, style: string, brandName: string) {
  const hooks: Record<string, string[]> = {
    educational: ["Did you know?", "Here's something surprising about", "Let me break down"],
    entertaining: ["You won't believe", "Wait until you see", "This changes everything"],
    promotional: ["Introducing", "Your new favorite", "Don't miss out"],
    storytelling: ["It all started when", "The moment I realized", "Our journey began"],
  };
  const hookStarts = hooks[style] ?? hooks.educational!;
  const title = `${hookStarts[Math.floor(Math.random() * hookStarts.length)]} ${topic}`;
  const sceneCount = Math.max(3, Math.ceil(durationSec / 10));
  const angles = ["close-up", "wide shot", "over-the-shoulder", "aerial", "tracking"] as const;
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    sceneNumber: i + 1,
    duration: Math.floor(durationSec / sceneCount),
    visualDescription: `${i === 0 ? "Opening shot: " : i === sceneCount - 1 ? "Closing: " : `Scene ${i + 1}: `}${topic} - ${style} style`,
    voiceover: `${i === 0 ? "Hey everyone! " : ""}${topic}${i < sceneCount - 1 ? "... and here's why it matters." : ". Subscribe for more!"}`,
    textOverlay: i === 0 ? title : `${topic} - Tip ${i + 1}`,
    cameraAngle: angles[i % 5],
  }));
  return {
    title,
    hook: hookStarts[0]!,
    scenes,
    cta: "Follow for more insights!",
    hashtags: [`#${topic.replace(/\s+/g, "")}`, "#content", "#tips"],
  };
}

const musicLibrary: Record<string, Array<Record<string, unknown>>> = {
  energetic: [
    { title: "Neon Lights", artist: "Synthwave Collective", genre: "electronic", bpm: 128, duration: "3:45", mood: "energetic", licenseType: "royalty-free", previewDescription: "Upbeat electronic with pulsing synths" },
    { title: "Pulse", artist: "Beat Architect", genre: "pop", bpm: 120, duration: "3:30", mood: "energetic", licenseType: "royalty-free", previewDescription: "High-energy pop with driving beat" },
  ],
  calm: [
    { title: "Gentle Waves", artist: "Ambient Soul", genre: "acoustic", bpm: 70, duration: "4:20", mood: "calm", licenseType: "royalty-free", previewDescription: "Soothing acoustic guitar and pads" },
    { title: "Morning Light", artist: "Peaceful Minds", genre: "lo-fi", bpm: 75, duration: "3:55", mood: "calm", licenseType: "royalty-free", previewDescription: "Gentle lo-fi beat with piano" },
  ],
  inspirational: [
    { title: "Rise Up", artist: "Cinematic Orchestra", genre: "cinematic", bpm: 90, duration: "4:10", mood: "inspirational", licenseType: "royalty-free", previewDescription: "Building cinematic with orchestral swells" },
    { title: "New Dawn", artist: "Epic Sounds", genre: "cinematic", bpm: 85, duration: "4:05", mood: "inspirational", licenseType: "royalty-free", previewDescription: "Uplifting orchestral composition" },
  ],
  playful: [{ title: "Funky Fresh", artist: "Groove Masters", genre: "pop", bpm: 110, duration: "3:15", mood: "playful", licenseType: "royalty-free", previewDescription: "Fun and bouncy pop track" }],
  dramatic: [{ title: "Dark Horizon", artist: "Tension Builders", genre: "cinematic", bpm: 60, duration: "4:30", mood: "dramatic", licenseType: "royalty-free", previewDescription: "Intense atmospheric build" }],
  corporate: [{ title: "Professional Edge", artist: "Business Beats", genre: "electronic", bpm: 100, duration: "3:45", mood: "corporate", licenseType: "royalty-free", previewDescription: "Clean professional electronic" }],
};
