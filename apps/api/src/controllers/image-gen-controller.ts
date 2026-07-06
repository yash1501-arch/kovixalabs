import type { Request, Response } from "express";
import { z } from "zod";
import { generateImages } from "../services/ai-client.js";

const GenerateSchema = z.object({
  brandId: z.string().min(1),
  prompt: z.string().min(1).max(4000),
  style: z.string().optional(),
  aspectRatio: z.string().optional(),
  count: z.number().int().min(1).max(4).optional().default(1),
});

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });

export async function generate(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = GenerateSchema.parse(request.body);
  const result = await generateImages({
    brand_id: input.brandId,
    prompt: input.prompt,
    style: input.style,
    aspect_ratio: input.aspectRatio,
    count: input.count,
    workspaceId,
  });
  response.json(result);
}
