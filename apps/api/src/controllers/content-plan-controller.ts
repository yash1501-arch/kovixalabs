import type { Request, Response } from "express";
import { z } from "zod";
import {
  listContentPlans,
  createContentPlan,
  listContentPlanItems,
  updateContentPlanItemStatus,
  deleteContentPlan,
} from "../services/content-plan-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const PlanParams = z.object({ planId: z.string().min(1) });
const ItemParams = z.object({ itemId: z.string().min(1) });

const PlanCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  brandId: z.string().min(1).optional(),
  goals: z.array(z.string()).optional(),
  platforms: z.array(z.enum(["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube"])).optional(),
  targetAudience: z.string().optional(),
});

const ItemStatusSchema = z.object({
  status: z.enum(["draft", "review", "approved", "published", "cancelled"]),
});

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listContentPlans(workspaceId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = PlanCreateSchema.parse(request.body);
  response.status(201).json(await createContentPlan(workspaceId, input));
}

export async function listItems(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { planId } = PlanParams.parse(request.params);
  response.json(await listContentPlanItems(workspaceId, planId));
}

export async function updateItemStatus(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { planId } = PlanParams.parse(request.params);
  const { itemId } = ItemParams.parse(request.params);
  const { status } = ItemStatusSchema.parse(request.body);
  response.json(await updateContentPlanItemStatus(workspaceId, planId, itemId, status));
}

export async function remove(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { planId } = PlanParams.parse(request.params);
  await deleteContentPlan(workspaceId, planId);
  response.status(204).send();
}
