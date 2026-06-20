import type { Request, Response } from "express";
import { z } from "zod";
import { runBrandAudit, runSocialAccountAudit } from "../services/audit/audit-service.js";

const AuditParams = z.object({
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
});

const SocialAccountAuditParams = z.object({
  workspaceId: z.string().min(1),
  id: z.string().min(1),
});

export async function auditBrand(request: Request, response: Response) {
  const { workspaceId, brandId } = AuditParams.parse(request.params);
  const result = await runBrandAudit(workspaceId, brandId);
  response.json(result);
}

export async function auditSocialAccount(request: Request, response: Response) {
  const { workspaceId, id } = SocialAccountAuditParams.parse(request.params);
  const result = await runSocialAccountAudit(id, workspaceId);
  response.json(result);
}
