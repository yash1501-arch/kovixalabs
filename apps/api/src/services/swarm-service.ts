import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import type { Prisma } from "@prisma/client";
import { executeSwarmTask } from "./ai-client.js";
import { searchMemoryEntries } from "./brand-service.js";

export async function listSwarmTasks(workspaceId: string) {
  return prisma.swarmTask.findMany({
    where: { workspaceId },
    include: { agents: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function dispatchSwarmTask(input: {
  workspaceId: string;
  brandId: string;
  type: string;
  priority: string;
  input: Record<string, unknown>;
  brandName: string;
}) {
  const roles = getSwarmRoles(input.type);

  const task = await prisma.swarmTask.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      type: input.type,
      status: "processing",
      priority: input.priority,
      input: input.input as Prisma.InputJsonValue,
      output: {},
      agentCount: roles.length,
      completedAgents: 0,
      agents: {
        create: roles.map((r) => ({
          workspaceId: input.workspaceId,
          role: r.role,
          status: "pending",
          progress: 0,
          currentAction: r.action,
          logs: [`Initialized: ${r.action}`],
        })),
      },
    },
    include: { agents: true },
  });

  try {
    let brandMemory: string[] = [];
    try {
      const memoryResults = await searchMemoryEntries(input.brandId, {
        query: input.type.replace(/_/g, " "),
        limit: 5,
      });
      brandMemory = memoryResults.map((m: any) => m.content);
    } catch {
      // Memory search is non-critical
    }

    const aiResult = await executeSwarmTask({
      task_id: task.id,
      task_type: input.type,
      agents: task.agents.map((a) => ({ agent_id: a.id, role: a.role, action: a.currentAction })),
      brand_context: `Brand: ${input.brandName}`,
      brand_memory: brandMemory,
      platform: (input.input.platform as string) ?? undefined,
    });

    for (const agentResult of aiResult.agents) {
      await prisma.swarmAgent.update({
        where: { id: agentResult.agent_id },
        data: {
          status: agentResult.status === "completed" ? "completed" : "failed",
          progress: agentResult.status === "completed" ? 100 : 0,
          logs: { push: [`Result: ${agentResult.result}`] } as any,
        },
      });
    }

    const completedCount = aiResult.completed_count;
    await prisma.swarmTask.update({
      where: { id: task.id },
      data: {
        status: completedCount === task.agentCount ? "completed" : "failed",
        completedAgents: completedCount,
        output: { agentResults: aiResult.agents } as Prisma.InputJsonValue,
      },
    });
  } catch {
    await prisma.swarmTask.update({
      where: { id: task.id },
      data: {
        status: "processing",
        output: getSwarmOutput(input.type, input.brandName, input.input) as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.swarmTask.findUnique({
    where: { id: task.id },
    include: { agents: true },
  });
}

export async function listSwarmAgents(taskId: string, workspaceId: string) {
  const task = await prisma.swarmTask.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Task not found.");
  return prisma.swarmAgent.findMany({ where: { taskId } });
}

function getSwarmRoles(type: string): Array<{ role: string; action: string }> {
  const roles: Record<string, Array<{ role: string; action: string }>> = {
    content_week: [
      { role: "Content Strategist", action: "Plan weekly content calendar" },
      { role: "Copywriter", action: "Write engaging captions" },
      { role: "Visual Designer", action: "Create accompanying visuals" },
      { role: "Hashtag Researcher", action: "Research optimal hashtags" },
      { role: "Analytics Agent", action: "Review performance metrics" },
    ],
    trend_analysis: [
      { role: "Trend Scout", action: "Identify emerging trends" },
      { role: "Data Analyst", action: "Analyze trend data" },
      { role: "Content Strategist", action: "Recommend content adaptations" },
    ],
    campaign_create: [
      { role: "Campaign Manager", action: "Design campaign structure" },
      { role: "Copywriter", action: "Write ad copy variants" },
      { role: "Visual Designer", action: "Design campaign assets" },
      { role: "Budget Analyst", action: "Optimize budget allocation" },
    ],
    brand_audit: [
      { role: "Brand Analyst", action: "Review brand presence" },
      { role: "Competitor Researcher", action: "Analyze competitor strategies" },
      { role: "Content Auditor", action: "Audit existing content" },
    ],
    hashtag_refresh: [
      { role: "Hashtag Researcher", action: "Research trending hashtags" },
      { role: "Content Strategist", action: "Recommend hashtag strategy" },
    ],
  };
  return roles[type] ?? roles.content_week!;
}

function getSwarmOutput(type: string, brandName: string, input: Record<string, unknown>): Record<string, unknown> {
  const outputs: Record<string, (b: string, i: Record<string, unknown>) => Record<string, unknown>> = {
    content_week: (b) => ({ calendar: "Generated 7-day content plan", recommendation: `Focus on ${b}'s strengths` }),
    trend_analysis: () => ({ topTrends: ["AI Content", "Short Video"], recommendation: "Increase short-form video output" }),
    campaign_create: (b, i) => ({ campaign: `${b} Campaign`, budget: i.budget ?? 1000 }),
    brand_audit: (b) => ({ score: 78, strengths: ["Engagement", "Brand Voice"], gaps: ["Video Content"] }),
    hashtag_refresh: () => ({ hashtags: ["#AI", "#ContentStrategy"], volume: "high" }),
  };
  return (outputs[type] ?? outputs.content_week!)(brandName, input);
}
