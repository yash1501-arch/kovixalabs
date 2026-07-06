import { prisma } from "../db.js";
import { decryptToken, isEncryptedToken } from "../utils/token-encryption.js";

const db = prisma as any;

export interface ModelOverride {
  provider?: string;
  model?: string;
  api_key?: string;
  api_url?: string;
  temperature?: number;
  max_tokens?: number;
}

export async function getWorkspaceDefaultModel(workspaceId: string): Promise<ModelOverride | null> {
  try {
    const model = await db.llmModel.findFirst({
      where: { workspaceId, enabled: true },
      orderBy: { isDefault: "desc" },
    });
    if (!model) return null;

    let apiKey = model.apiKey || "";
    if (apiKey && isEncryptedToken(apiKey)) {
      apiKey = decryptToken(apiKey);
    }

    return {
      provider: model.provider || undefined,
      model: model.model || undefined,
      api_key: apiKey || undefined,
      api_url: model.baseUrl || undefined,
      temperature: model.temperature ?? undefined,
      max_tokens: model.maxTokens ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getModelOverrideById(workspaceId: string, modelId: string): Promise<ModelOverride | null> {
  try {
    const model = await db.llmModel.findFirst({
      where: { id: modelId, workspaceId, enabled: true },
    });
    if (!model) return null;

    let apiKey = model.apiKey || "";
    if (apiKey && isEncryptedToken(apiKey)) {
      apiKey = decryptToken(apiKey);
    }

    return {
      provider: model.provider || undefined,
      model: model.model || undefined,
      api_key: apiKey || undefined,
      api_url: model.baseUrl || undefined,
      temperature: model.temperature ?? undefined,
      max_tokens: model.maxTokens ?? undefined,
    };
  } catch {
    return null;
  }
}

export function attachModelOverride(body: Record<string, any>, override: ModelOverride | null): Record<string, any> {
  if (override) {
    body.model_override = override;
  }
  return body;
}
