import type { Request, Response } from "express";
import { z } from "zod";
import {
  listPosts,
  createPost,
  updatePostStatus,
  deletePost,
  publishPostToMeta,
  getPost,
  updatePost,
} from "../services/post-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const PostParams = z.object({ postId: z.string().min(1) });

const PostCreateSchema = z.object({
  brandId: z.string().min(1),
  platform: z.enum(["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube"]),
  caption: z.string().max(2200).default(""),
  hashtags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
});

const PostUpdateSchema = z.object({
  status: z.enum(["draft", "scheduled", "published", "failed"]),
  scheduledAt: z.string().datetime().optional(),
});

const PostEditSchema = z.object({
  caption: z.string().max(2200).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listPosts(workspaceId));
}

export async function show(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { postId } = PostParams.parse(request.params);
  const post = await getPost(workspaceId, postId);
  if (!post) { response.status(404).json({ error: "not_found" }); return; }
  response.json(post);
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = PostCreateSchema.parse(request.body);
  response.status(201).json(await createPost(workspaceId, input));
}

export async function update(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { postId } = PostParams.parse(request.params);
  const input = PostEditSchema.parse(request.body);
  response.json(await updatePost(workspaceId, postId, input));
}

export async function updateStatus(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { postId } = PostParams.parse(request.params);
  const input = PostUpdateSchema.parse(request.body);
  response.json(await updatePostStatus(workspaceId, postId, input));
}

export async function remove(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { postId } = PostParams.parse(request.params);
  await deletePost(workspaceId, postId);
  response.status(204).send();
}

export async function publish(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { postId } = PostParams.parse(request.params);
  await publishPostToMeta(workspaceId, postId);
  response.json({ status: "published" });
}
