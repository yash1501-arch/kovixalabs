import type { Request, Response } from "express";
import { z } from "zod";
import {
  listBrands,
  createBrand,
  loadBrand,
  updateBrand,
  listMemoryEntries,
  createMemoryEntry,
  deleteMemoryEntry,
  searchMemoryEntries,
  ingestBrandDocument,
  summarizeBrandDocument,
} from "../services/brand-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const BrandParams = z.object({ brandId: z.string().min(1) });

const BrandProfileSchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().optional(),
  description: z.string().optional(),
  voice: z.string().optional(),
  visualStyle: z.string().optional(),
  targetAudience: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  guidelines: z.string().optional(),
  logoUrl: z.string().optional(),
  website: z.string().optional(),
});

const BrandMemoryEntrySchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string().min(1),
  category: z.string().optional(),
  source: z.string().optional(),
});

const BrandMemorySearchSchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
});

export async function previewBrand(_request: Request, response: Response) {
  response.status(201).json({
    id: crypto.randomUUID(),
    name: "Preview Brand",
    industry: "Technology",
    createdAt: new Date().toISOString(),
  });
}

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listBrands(workspaceId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = BrandProfileSchema.parse(request.body);
  response.status(201).json(await createBrand(workspaceId, input));
}

export async function show(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  response.json(await loadBrand(brandId));
}

export async function update(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const input = BrandProfileSchema.parse(request.body);
  response.json(await updateBrand(brandId, input));
}

export async function listMemory(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  response.json(await listMemoryEntries(brandId));
}

export async function createMemory(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const input = BrandMemoryEntrySchema.parse(request.body);
  response.status(201).json(await createMemoryEntry(brandId, input));
}

export async function searchMemory(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const input = BrandMemorySearchSchema.parse(request.body);
  response.json(await searchMemoryEntries(brandId, input));
}

export async function destroyMemory(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const { entryId } = z.object({ entryId: z.string().min(1) }).parse(request.params);
  await deleteMemoryEntry(entryId, brandId);
  response.status(204).send();
}

const DocumentIngestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  source: z.string().optional(),
});

export async function ingestDocument(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const input = DocumentIngestSchema.parse(request.body);
  response.json(await ingestBrandDocument(brandId, input));
}

const DocumentSummarizeSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
});

export async function summarizeDocument(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const input = DocumentSummarizeSchema.parse(request.body);
  response.json(await summarizeBrandDocument(brandId, input));
}
