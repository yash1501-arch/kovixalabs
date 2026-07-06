import type { Request, Response } from "express";
import { z } from "zod";
import { createMediaFromUrl } from "../services/upload-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const UploadFromUrlSchema = z.object({
  brandId: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});

export async function uploadFromUrl(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = UploadFromUrlSchema.parse(request.body);
  response.status(201).json(await createMediaFromUrl(workspaceId, input));
}
