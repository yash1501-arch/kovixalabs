import type { Request, Response } from "express";
import { z } from "zod";
import {
  listMediaAssets,
  createMediaAsset,
  loadMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
} from "../services/media-asset-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const AssetParams = z.object({ assetId: z.string().min(1) });

const CreateAssetSchema = z.object({
  brandId: z.string().min(1),
  type: z.enum(["IMAGE", "VIDEO", "AUDIO", "FACE_SWAP", "VIDEO_FACE_SWAP", "DOCUMENT", "OTHER"]),
  url: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  altText: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const UpdateAssetSchema = z.object({
  url: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REJECTED"]).optional(),
  altText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const brandId = request.query.brandId as string | undefined;
  response.json(await listMediaAssets(workspaceId, brandId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = CreateAssetSchema.parse(request.body);
  response.status(201).json(await createMediaAsset(workspaceId, input));
}

export async function show(request: Request, response: Response) {
  const { workspaceId, assetId } = { ...WorkspaceParams.parse(request.params), ...AssetParams.parse(request.params) };
  response.json(await loadMediaAsset(assetId, workspaceId));
}

export async function update(request: Request, response: Response) {
  const { workspaceId, assetId } = { ...WorkspaceParams.parse(request.params), ...AssetParams.parse(request.params) };
  const input = UpdateAssetSchema.parse(request.body);
  response.json(await updateMediaAsset(assetId, workspaceId, input));
}

export async function destroy(request: Request, response: Response) {
  const { workspaceId, assetId } = { ...WorkspaceParams.parse(request.params), ...AssetParams.parse(request.params) };
  await deleteMediaAsset(assetId, workspaceId);
  response.status(204).send();
}
