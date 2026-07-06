import type { LlmModelCreate, LlmModelUpdate } from "@kovixalabs/shared";
import { LlmModelSchema } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { encryptToken, decryptToken, isEncryptedToken } from "../utils/token-encryption.js";

const db = prisma as any;

function serialize(model: any) {
  return LlmModelSchema.parse({
    id: model.id,
    workspaceId: model.workspaceId,
    provider: model.provider,
    name: model.name,
    model: model.model,
    apiKey: model.apiKey ? "encrypted" : null,
    baseUrl: model.baseUrl,
    capabilities: model.capabilities,
    isDefault: model.isDefault,
    maxTokens: model.maxTokens,
    temperature: model.temperature,
    enabled: model.enabled,
    createdAt: model.createdAt instanceof Date ? model.createdAt.toISOString() : model.createdAt,
    updatedAt: model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt,
  });
}

export async function listLlmModels(workspaceId: string) {
  const models = await db.llmModel.findMany({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return models.map(serialize);
}

export async function getLlmModel(workspaceId: string, modelId: string) {
  const model = await db.llmModel.findFirst({ where: { id: modelId, workspaceId } });
  if (!model) throw new ApiError(404, "not_found", "LLM model not found.");
  return serialize(model);
}

export async function getDecryptedApiKey(workspaceId: string, modelId: string): Promise<string> {
  const model = await db.llmModel.findFirst({ where: { id: modelId, workspaceId } });
  if (!model) throw new ApiError(404, "not_found", "LLM model not found.");
  if (!model.apiKey) throw new ApiError(400, "no_api_key", "Model has no API key configured.");
  return isEncryptedToken(model.apiKey) ? decryptToken(model.apiKey) : model.apiKey;
}

export async function createLlmModel(workspaceId: string, input: LlmModelCreate) {
  if (input.isDefault) {
    await db.llmModel.updateMany({
      where: { workspaceId, isDefault: true },
      data: { isDefault: false },
    });
  }
  const model = await db.llmModel.create({
    data: {
      workspaceId,
      provider: input.provider,
      name: input.name,
      model: input.model,
      apiKey: input.apiKey ? encryptToken(input.apiKey) : null,
      baseUrl: input.baseUrl || null,
      capabilities: input.capabilities,
      isDefault: input.isDefault,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    },
  });
  return serialize(model);
}

export async function updateLlmModel(workspaceId: string, modelId: string, input: LlmModelUpdate) {
  const existing = await db.llmModel.findFirst({ where: { id: modelId, workspaceId } });
  if (!existing) throw new ApiError(404, "not_found", "LLM model not found.");

  if (input.isDefault) {
    await db.llmModel.updateMany({
      where: { workspaceId, isDefault: true, id: { not: modelId } },
      data: { isDefault: false },
    });
  }

  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.model !== undefined) data.model = input.model;
  if (input.apiKey !== undefined) data.apiKey = input.apiKey ? encryptToken(input.apiKey) : null;
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl || null;
  if (input.capabilities !== undefined) data.capabilities = input.capabilities;
  if (input.isDefault !== undefined) data.isDefault = input.isDefault;
  if (input.maxTokens !== undefined) data.maxTokens = input.maxTokens;
  if (input.temperature !== undefined) data.temperature = input.temperature;

  const updated = await db.llmModel.update({ where: { id: modelId }, data });
  return serialize(updated);
}

export async function deleteLlmModel(workspaceId: string, modelId: string) {
  const existing = await db.llmModel.findFirst({ where: { id: modelId, workspaceId } });
  if (!existing) throw new ApiError(404, "not_found", "LLM model not found.");
  await db.llmModel.delete({ where: { id: modelId } });
}

export async function testLlmModel(workspaceId: string, modelId: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const model = await db.llmModel.findFirst({ where: { id: modelId, workspaceId } });
  if (!model) throw new ApiError(404, "not_found", "LLM model not found.");

  const start = Date.now();
  try {
    const apiKey = model.apiKey ? (isEncryptedToken(model.apiKey) ? decryptToken(model.apiKey) : model.apiKey) : "";
    const baseUrl = model.baseUrl || "https://api.openai.com/v1";

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages: [{ role: "user", content: "Respond with only the word: ok" }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, latencyMs: Date.now() - start, error: `API error ${res.status}: ${body.slice(0, 200)}` };
    }

    return { success: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - start, error: err.message ?? "Connection failed" };
  }
}
