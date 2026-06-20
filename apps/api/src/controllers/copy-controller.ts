import type { Request, Response } from "express";
import { z } from "zod";
import { generateCopy } from "../services/ai-client.js";

const CopyRequestSchema = z.object({
  brandId: z.string().min(1),
  platform: z.string().min(1),
  objective: z.string().min(1),
  topic: z.string().min(1),
  toneOverride: z.string().optional(),
  variants: z.number().int().min(1).max(10).default(3),
});

export async function handleGenerateCopy(req: Request, res: Response) {
  const userId = req.user!.id;
  const workspaceId = req.user!.workspaceId;

  const body = CopyRequestSchema.parse(req.body);

  const aiResult = await generateCopy({
    brandId: body.brandId,
    platform: body.platform,
    objective: body.objective,
    topic: body.topic,
    toneOverride: body.toneOverride,
    variants: body.variants,
  });

  res.json({
    taskId: aiResult.task_id,
    brandId: body.brandId,
    workspaceId,
    model: aiResult.model,
    variants: aiResult.variants,
  });
}
