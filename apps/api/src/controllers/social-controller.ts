import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config.js";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  type MetaPlatform
} from "../services/meta-api.js";
import * as linkedinApi from "../services/linkedin-api.js";
import * as twitterApi from "../services/twitter-api.js";
import * as tiktokApi from "../services/tiktok-api.js";
import * as youtubeApi from "../services/youtube-api.js";
import {
  connectMetaAccounts,
  connectLinkedIn,
  connectTwitter,
  connectTikTok,
  connectYouTube,
  disconnectSocialAccount,
  listConnectedAccounts
} from "../services/social-account-service.js";
import { ApiError } from "../utils/api-error.js";
import { createOAuthState, verifyOAuthState } from "../utils/oauth-state.js";
import {
  connectInstagramBasicAccount
} from "../services/social-account-service.js";
import { buildAuthorizationUrl as buildInstagramAuthUrl } from "../services/instagram-api.js";

const connectQuerySchema = z.object({
  workspaceId: z.string().min(1).default("default-workspace"),
  userId: z.string().min(1).optional()
});

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional()
});

const accountsQuerySchema = z.object({
  workspaceId: z.string().min(1).default("default-workspace"),
  userId: z.string().min(1).optional()
});

const disconnectQuerySchema = z.object({
  workspaceId: z.string().min(1).default("default-workspace"),
  userId: z.string().min(1).optional()
});

function frontendRedirect(params: Record<string, string>): string {
  const url = new URL("/integrations", env.corsOrigin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function requestUserId(request: Request, fallbackWorkspaceId: string): string {
  const headerUserId = request.header("x-user-id");
  if (headerUserId) {
    return headerUserId;
  }

  return fallbackWorkspaceId;
}

export function connectMeta(platform: MetaPlatform) {
  return (request: Request, response: Response) => {
    const query = connectQuerySchema.parse(request.query);
    const workspaceId = query.workspaceId;
    const userId = query.userId ?? requestUserId(request, workspaceId);
    const state = createOAuthState({ platform, workspaceId, userId });

    response.redirect(buildAuthorizationUrl({ platform, state }));
  };
}

export function callbackMeta(platform: MetaPlatform) {
  return async (request: Request, response: Response) => {
    const query = callbackQuerySchema.parse(request.query);

    if (query.error) {
      response.redirect(
        frontendRedirect({
          error: query.error_description ?? query.error
        })
      );
      return;
    }

    if (!query.code) {
      throw new ApiError(400, "missing_oauth_code", "Missing Meta OAuth code.");
    }

    const state = verifyOAuthState(query.state);
    if (state.platform !== platform) {
      throw new ApiError(400, "invalid_oauth_state", "OAuth platform state mismatch.");
    }

    const shortLivedToken = await exchangeCodeForToken(platform, query.code);
    const result = await connectMetaAccounts({
      workspaceId: state.workspaceId,
      userId: state.userId,
      platform,
      shortLivedToken: shortLivedToken.access_token
    });
    const connectedCount =
      result.facebookAccounts.length + result.instagramAccounts.length;

    response.redirect(
      frontendRedirect({
        success: "true",
        platform,
        connected: String(connectedCount)
      })
    );
  };
}

export async function listAccounts(request: Request, response: Response) {
  const query = accountsQuerySchema.parse(request.query);
  const workspaceId = request.params.workspaceId ?? query.workspaceId;
  const accounts = await listConnectedAccounts({
    workspaceId,
    userId: query.userId
  });

  response.json(accounts);
}

// ── LinkedIn OAuth ───────────────────────────────────────────

export function connectLinkedInOAuth(request: Request, response: Response) {
  const query = connectQuerySchema.parse(request.query);
  const workspaceId = query.workspaceId;
  const userId = query.userId ?? requestUserId(request, workspaceId);
  const state = createOAuthState({ platform: "linkedin", workspaceId, userId });
  response.redirect(linkedinApi.buildAuthorizationUrl(state));
}

export async function callbackLinkedIn(request: Request, response: Response) {
  const query = callbackQuerySchema.parse(request.query);
  if (query.error) { response.redirect(frontendRedirect({ error: query.error_description ?? query.error })); return; }
  if (!query.code) throw new ApiError(400, "missing_oauth_code", "Missing LinkedIn OAuth code.");

  const state = verifyOAuthState(query.state);
  if (state.platform !== "linkedin") {
    throw new ApiError(400, "invalid_oauth_state", "OAuth platform state mismatch.");
  }

  await connectLinkedIn({ workspaceId: state.workspaceId, userId: state.userId, code: query.code });
  response.redirect(frontendRedirect({ success: "true", platform: "linkedin", connected: "1" }));
}

// ── Twitter/X OAuth ──────────────────────────────────────────

export function connectTwitterOAuth(request: Request, response: Response) {
  const query = connectQuerySchema.parse(request.query);
  const workspaceId = query.workspaceId;
  const userId = query.userId ?? requestUserId(request, workspaceId);
  const codeVerifier = crypto.randomUUID().replace(/-/g, "").slice(0, 128);
  const state = createOAuthState({ platform: "twitter", workspaceId, userId, codeVerifier });
  response.redirect(twitterApi.buildAuthorizationUrl(state, codeVerifier));
}

export async function callbackTwitter(request: Request, response: Response) {
  const query = callbackQuerySchema.parse(request.query);
  if (query.error) { response.redirect(frontendRedirect({ error: query.error_description ?? query.error })); return; }
  if (!query.code) throw new ApiError(400, "missing_oauth_code", "Missing Twitter OAuth code.");

  const state = verifyOAuthState(query.state);
  if (state.platform !== "twitter") {
    throw new ApiError(400, "invalid_oauth_state", "OAuth platform state mismatch.");
  }

  await connectTwitter({ workspaceId: state.workspaceId, userId: state.userId, code: query.code, codeVerifier: state.codeVerifier ?? "" });
  response.redirect(frontendRedirect({ success: "true", platform: "twitter", connected: "1" }));
}

// ── TikTok OAuth ─────────────────────────────────────────────

export function connectTikTokOAuth(request: Request, response: Response) {
  const query = connectQuerySchema.parse(request.query);
  const workspaceId = query.workspaceId;
  const userId = query.userId ?? requestUserId(request, workspaceId);
  const state = createOAuthState({ platform: "tiktok", workspaceId, userId });
  response.redirect(tiktokApi.buildAuthorizationUrl(state));
}

export async function callbackTikTok(request: Request, response: Response) {
  const query = callbackQuerySchema.parse(request.query);
  if (query.error) { response.redirect(frontendRedirect({ error: query.error_description ?? query.error })); return; }
  if (!query.code) throw new ApiError(400, "missing_oauth_code", "Missing TikTok OAuth code.");

  const state = verifyOAuthState(query.state);
  if (state.platform !== "tiktok") {
    throw new ApiError(400, "invalid_oauth_state", "OAuth platform state mismatch.");
  }

  await connectTikTok({ workspaceId: state.workspaceId, userId: state.userId, code: query.code });
  response.redirect(frontendRedirect({ success: "true", platform: "tiktok", connected: "1" }));
}

// ── YouTube OAuth ────────────────────────────────────────────

export function connectYouTubeOAuth(request: Request, response: Response) {
  const query = connectQuerySchema.parse(request.query);
  const workspaceId = query.workspaceId;
  const userId = query.userId ?? requestUserId(request, workspaceId);
  const state = createOAuthState({ platform: "youtube", workspaceId, userId });
  response.redirect(youtubeApi.buildAuthorizationUrl(state));
}

export async function callbackYouTube(request: Request, response: Response) {
  const query = callbackQuerySchema.parse(request.query);
  if (query.error) { response.redirect(frontendRedirect({ error: query.error_description ?? query.error })); return; }
  if (!query.code) throw new ApiError(400, "missing_oauth_code", "Missing YouTube OAuth code.");

  const state = verifyOAuthState(query.state);
  if (state.platform !== "youtube") {
    throw new ApiError(400, "invalid_oauth_state", "OAuth platform state mismatch.");
  }

  await connectYouTube({ workspaceId: state.workspaceId, userId: state.userId, code: query.code });
  response.redirect(frontendRedirect({ success: "true", platform: "youtube", connected: "1" }));
}

// ── Instagram Basic (Path B — standalone) ───────────────────

export function connectInstagramBasic(request: Request, response: Response) {
  const query = connectQuerySchema.parse(request.query);
  const workspaceId = query.workspaceId;
  const userId = query.userId ?? requestUserId(request, workspaceId);
  const state = createOAuthState({ platform: "instagram-basic", workspaceId, userId });
  response.redirect(buildInstagramAuthUrl(state));
}

export async function callbackInstagramBasic(request: Request, response: Response) {
  const query = callbackQuerySchema.parse(request.query);
  if (query.error) { response.redirect(frontendRedirect({ error: query.error_description ?? query.error })); return; }
  if (!query.code) throw new ApiError(400, "missing_oauth_code", "Missing Instagram OAuth code.");

  const state = verifyOAuthState(query.state);
  if (state.platform !== "instagram-basic") {
    throw new ApiError(400, "invalid_oauth_state", "OAuth platform state mismatch.");
  }

  const result = await connectInstagramBasicAccount({ workspaceId: state.workspaceId, userId: state.userId, code: query.code });
  response.redirect(frontendRedirect({ success: "true", platform: "instagram", connected: "1" }));
}

export async function disconnectAccount(request: Request, response: Response) {
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const query = disconnectQuerySchema.parse(request.query);
  const workspaceId = request.params.workspaceId ?? query.workspaceId;

  await disconnectSocialAccount({
    id,
    workspaceId,
    userId: query.userId
  });

  response.status(204).send();
}
