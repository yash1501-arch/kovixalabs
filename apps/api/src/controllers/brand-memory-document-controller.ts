import type { Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../utils/response.js";
import { listDocuments, createDocument, deleteDocument, reembedAllDocuments, getDocumentStats } from "../services/brand-memory-document-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const BrandParams = z.object({ brandId: z.string().min(1) });
const DocumentParams = z.object({ documentId: z.string().min(1) });

const CreateDocumentBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  sourceType: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
});

export async function listBrandDocuments(request: Request, response: Response) {
  const { workspaceId, brandId } = { ...WorkspaceParams.parse(request.params), ...BrandParams.parse(request.params) };
  const docs = await listDocuments(workspaceId, brandId);
  sendSuccess(response, docs);
}

export async function createBrandDocument(request: Request, response: Response) {
  const { workspaceId, brandId } = { ...WorkspaceParams.parse(request.params), ...BrandParams.parse(request.params) };
  const body = CreateDocumentBody.parse(request.body);
  const doc = await createDocument({ workspaceId, brandId, ...body });
  sendSuccess(response, doc, 201);
}

export async function deleteBrandDocument(request: Request, response: Response) {
  const { workspaceId, documentId } = { ...WorkspaceParams.parse(request.params), ...DocumentParams.parse(request.params) };
  await deleteDocument(documentId, workspaceId);
  response.status(204).send();
}

export async function reembedBrandDocuments(request: Request, response: Response) {
  const { workspaceId, brandId } = { ...WorkspaceParams.parse(request.params), ...BrandParams.parse(request.params) };
  const result = await reembedAllDocuments(workspaceId, brandId);
  sendSuccess(response, result);
}

export async function brandDocumentStats(request: Request, response: Response) {
  const { workspaceId, brandId } = { ...WorkspaceParams.parse(request.params), ...BrandParams.parse(request.params) };
  const stats = await getDocumentStats(workspaceId, brandId);
  sendSuccess(response, stats);
}
