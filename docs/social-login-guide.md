# Social Login Integration Guide — Instagram, Facebook, Twitter/X

## Overview

AISMOS uses server-side OAuth 2.0 flows. The frontend redirects the user to the API, which handles the full handshake with the provider, stores tokens encrypted in PostgreSQL, and redirects back to the frontend.

```
Browser → API /api/social/{platform}/connect → Provider auth page
Provider → Redirect → API /api/social/{platform}/callback → Browser → /integrations
```

---

## 1. Prerequisites — Platform App Registration

### Facebook / Instagram (Meta Graph API — Path A)

Required for both Facebook Pages and Instagram Business/Creator accounts.

| Step | Action |
|---|---|
| 1 | Go to https://developers.facebook.com → **My Apps** → **Create App** |
| 2 | Choose **Business** as the app type |
| 3 | Add **Instagram Graph API** and **Facebook Login** products |
| 4 | Under **Facebook Login → Settings**: add `http://localhost:4000/api/social/facebook/callback` and `http://localhost:4000/api/social/instagram/callback` to **Valid OAuth Redirect URIs** |
| 5 | Under **Instagram Graph API** → configure the same redirect URIs |
| 6 | Go to **App Dashboard → Settings → Basic**: copy **App ID** and **App Secret** |
| 7 | **(For production only)** Submit your app for **App Review** to get `instagram_basic`, `instagram_manage_insights`, `pages_manage_metadata`, `business_management` approved. In development mode, any test user works. |

**Requirements for Instagram Path A:**
- A **Facebook Page** (create one from your Facebook profile)
- An **Instagram Business or Creator Account** linked to that Facebook Page (Settings → Account → Linked Accounts in Instagram)
- The Facebook Page must be visible to the app (add the test user as a Page admin)

**Env vars needed:**

```env
META_APP_ID=123456789012345
META_APP_SECRET=a1b2c3d4e5f6g7h8i9j0...
META_REDIRECT_URI=http://localhost:4000/api/social/{platform}/callback
META_GRAPH_API_VERSION=v22.0
META_OAUTH_SCOPES=instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list,pages_manage_metadata,business_management
```

### Instagram Basic Display (Path B — Standalone)

Fallback for personal Instagram accounts (no Business/Creator upgrade needed).

| Step | Action |
|---|---|
| 1 | Same Meta app as above — add **Instagram Basic Display** product |
| 2 | Go to **Instagram Basic Display → Settings**: add `http://localhost:4000/api/social/instagram-basic/callback` to **Valid OAuth Redirect URIs** |
| 3 | Copy **App ID** and **App Secret** from the same dashboard |

**Requirements:**
- Any Instagram account (personal, creator, or business)
- No Facebook Page required
- Rate-limited to 200 requests/hour per user

**Env vars needed:**

```env
# Reuses META_APP_ID and META_APP_SECRET
INSTAGRAM_BASIC_REDIRECT_URI=http://localhost:4000/api/social/instagram-basic/callback
```

### Twitter / X

| Step | Action |
|---|---|
| 1 | Go to https://developer.twitter.com → **Developer Portal** → **Projects & Apps** |
| 2 | Create a Project → Create an App |
| 3 | Under **User Authentication Settings**: enable **OAuth 2.0** with **Confidential Client** |
| 4 | Add `http://localhost:4000/api/social/twitter/callback` to **Callback / Redirect URLs** |
| 5 | Select **Web App** as the app type |
| 6 | Enable **OAuth 2.0 Authorization Code Flow with PKCE** |
| 7 | Required scopes: **tweet.read**, **tweet.write**, **users.read**, **offline.access** |
| 8 | Copy **Client ID** and **Client Secret** |

**Env vars needed:**

```env
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
TWITTER_REDIRECT_URI=http://localhost:4000/api/social/twitter/callback
```

### Shared

```env
ENCRYPTION_SECRET=a-secure-256-bit-hex-string-at-least-32-chars
API_CORS_ORIGIN=http://localhost:3000
```

---

## 2. OAuth Flows (What Happens at Each Step)

### Facebook / Instagram (Path A — Meta Graph API)

```
  ┌─────────┐   1. Click "Connect"     ┌──────────┐
  │         │ ──────────────────────▶  │          │
  │  Front  │                          │  AISMOS  │
  │  End    │ ◀──────────────────────  │  API     │
  │         │   6. Redirect to /integrations        │
  └─────────┘                          └─────┬────┘
                                             │
                          2. Create signed OAuth state
                            (platform, workspaceId, userId, nonce, 10min expiry)
                                             │
                          3. Redirect to Facebook OAuth dialog
                            /dialog/oauth?client_id=...&state=...&scope=...
                                             │
                                    ┌────────▼────────┐
                                    │  Facebook OAuth  │
                                    │  (User logs in,  │
                                    │   grants scopes) │
                                    └────────┬────────┘
                                             │
                          4. Redirect back to callback URL
                            ?code=AUTH_CODE&state=SIGNED_STATE
                                             │
                                    ┌────────▼────────┐
                                    │  AISMOS API     │
                                    │  /callback      │
                                    └────────┬────────┘
                                             │
                         5. Validate state (HMAC, expiry)
                            Exchange code for short-lived token (2h)
                            Exchange short-lived for long-lived token (60d)
                            Fetch Facebook Pages: GET /me/accounts
                            (For Instagram: fetch linked IG business account)
                            Encrypt token → store as SocialAccount
```

**Key files:**
- `apps/api/src/controllers/social-controller.ts` — `connectMeta()`, `handleMetaCallback()`
- `apps/api/src/services/meta-api.ts` — token exchange, pages fetch, IG account fetch
- `apps/api/src/services/social-account-service.ts` — `connectMetaAccounts()` upsert logic
- `apps/api/src/utils/oauth-state.ts` — signed state creation/verification

### Twitter / X (OAuth 2.0 + PKCE)

```
  ┌─────────┐   1. Click "Connect"     ┌──────────┐
  │  Front  │ ──────────────────────▶  │  AISMOS  │
  │  End    │                          │  API     │
  └─────────┘                          └─────┬────┘
                                             │
                          2. Generate state + code_verifier
                            Redirect to Twitter authorize URL
                            /i/oauth2/authorize?client_id=...&code_challenge=...
                                             │
                                    ┌────────▼────────┐
                                    │  Twitter OAuth   │
                                    └────────┬────────┘
                                             │
                          3. Redirect back to callback
                            ?code=AUTH_CODE&state=STATE
                                             │
                                    ┌────────▼────────┐
                                    │  AISMOS API     │
                                    │  /callback      │
                                    └─────────────────┘
                          4. Exchange code + code_verifier for token
                            POST /2/oauth2/token (Basic auth)
                            Fetch user: GET /2/users/me
                            Encrypt token → store as SocialAccount
```

**⚠️ Known issue:** The code verifier is regenerated on the callback side instead of being stored from the initial redirect. This causes PKCE validation to fail. Fix: persist the verifier in the OAuth state token or in a server-side session.

**Key files:**
- `apps/api/src/services/twitter-api.ts`

---

## 3. Setting Up Environment Variables

Copy the full template into `apps/api/.env`:

```env
# ── Meta / Facebook / Instagram ──
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=http://localhost:4000/api/social/{platform}/callback
META_GRAPH_API_VERSION=v22.0
META_OAUTH_SCOPES=instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list,pages_manage_metadata,business_management

# ── Instagram Basic Display (standalone, no FB Page needed) ──
INSTAGRAM_BASIC_REDIRECT_URI=http://localhost:4000/api/social/instagram-basic/callback

# ── Twitter / X ──
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_REDIRECT_URI=http://localhost:4000/api/social/twitter/callback

# ── Security ──
ENCRYPTION_SECRET=<at-least-32-characters>
```

After adding, restart the API.

---

## 4. Connecting from the Frontend

The connect button should redirect the browser to:

```
http://localhost:4000/api/social/{platform}/connect?workspaceId={workspaceId}&userId={userId}
```

Where `{platform}` is one of: `facebook`, `instagram`, `instagram-basic`, `twitter`, `linkedin`, `tiktok`, `youtube`.

**Current frontend (`apps/web/app/integrations/page.tsx`):**

The page currently uses a mock flow (sends handle + displayName to a POST endpoint). To switch to real OAuth:

1. Change the connect button handler from the mock POST to a redirect:
   ```tsx
   window.location.href = `${apiOrigin}/api/social/${platform}/connect?workspaceId=${workspaceId}&userId=${userId}`;
   ```

2. The API will redirect to the provider, and after authorization, redirect back to:
   ```
   {CORS_ORIGIN}/integrations?success=true&platform={platform}&connected={count}
   ```

3. On the integrations page, detect the query params on mount to show a success toast.

**Existing frontend route for OAuth callback:** The API redirects to `{CORS_ORIGIN}/integrations?success=true&platform=...&connected=...` on success, or `{CORS_ORIGIN}/integrations?error=...` on failure. The integrations page should read these query params.

---

## 5. Token Storage & Encryption

Tokens are encrypted at rest using AES-256-GCM:

```
Algorithm: AES-256-GCM
Key derivation: SHA-256(ENCRYPTION_SECRET)
Storage format: enc:v1:{iv_base64url}:{authTag_base64url}:{ciphertext_base64url}
```

Stored in the `SocialAccount` model fields:
- `accessToken` — main access token (encrypted)
- `pageAccessToken` — Meta Page-specific token (encrypted)
- `tokenExpiresAt` — expiry timestamp (plaintext, used for refresh decisions)
- `scopes` — granted permission scopes

**Token lifespans:**

| Platform | Short-lived | Long-lived | Refreshable |
|---|---|---|---|
| Meta (FB/IG) | 1-2 hours | 60 days | Yes (via `fb_exchange_token`) |
| Instagram Basic | 1 hour | 60 days | Yes (via `ig_exchange_token`) |
| Twitter | 2 hours | — | Yes (via `refresh_token`, but not stored) |
| LinkedIn | — | No expiry | No |
| TikTok | — | No expiry | Yes (via `refresh_token`, but not stored) |
| YouTube | 1 hour | — | Yes (via `refresh_token`, but not stored) |

---

## 6. Token Refresh (Scheduled)

Meta tokens can be refreshed automatically. The function `refreshExpiringMetaTokens()` in `social-account-service.ts` scans for tokens expiring within 7 days and extends them by 60 days.

**To enable scheduled refresh, wire it into the worker scheduler** (`services/workers/src/index.ts`):

```typescript
// In the scheduler setup:
scheduler.register("meta-token-refresh", 6 * 60 * 60 * 1000, async () => {
  await fetch("http://localhost:4000/api/internal/refresh-tokens", { method: "POST" });
});
```

And add a corresponding internal route:

```typescript
// In app.ts or internal-routes.ts
router.post("/refresh-tokens", async (req, res) => {
  const result = await refreshExpiringMetaTokens();
  res.json(result);
});
```

For Twitter, TikTok, and YouTube: the `refresh_token` is currently discarded. The `SocialAccount` model needs a `refreshToken` field before scheduled refresh can work for these platforms.

---

## 7. Verifying It Works

After setting up env vars and restarting:

**Test the OAuth flow manually via curl/browser:**

```bash
# This redirects to Facebook (open in browser, not curl)
open http://localhost:4000/api/social/facebook/connect?workspaceId=YOUR_WS_ID&userId=YOUR_USER_ID
```

**Check connected accounts:**

```bash
curl http://localhost:4000/api/social/accounts?workspaceId=YOUR_WS_ID \
  -H "Authorization: Bearer YOUR_JWT"
```

**Test token encryption round-trip:**

```typescript
import { encryptToken, decryptToken } from "../utils/token-encryption.js";

const enc = encryptToken("my-token");
console.log(enc); // enc:v1:...
const dec = decryptToken(enc);
console.log(dec); // my-token
```

---

## 8. Known Issues & Fixes

| Issue | Impact | Fix |
|---|---|---|
| Twitter PKCE verifier mismatch | Twitter auth always fails | Store `codeVerifier` in OAuth state token so callback can use the same value |
| Non-Meta flows hardcode `workspaceId: "default"` | Multi-workspace isolation broken for Twitter/LinkedIn/TikTok/YouTube | Encode workspaceId and userId into the OAuth state, verify on callback |
| `refresh_token` not stored for Twitter/TikTok/YouTube | Tokens expire permanently after 2h (Twitter) or 1h (YouTube) | Add `refreshToken` field to `SocialAccount` model + store it |
| No scheduled token refresh running | All tokens expire after 60 days | Wire `refreshExpiringMetaTokens()` into the worker scheduler |
| Frontend uses mock flow | Real OAuth not triggered from UI | Change connect button to redirect to `/api/social/{platform}/connect` |
| Platform name mismatch (`"x"` vs `"twitter"`) | Shared schema uses `"x"` but API uses `"twitter"` | Align on one identifier, update both frontend and backend |

---

## Quick Start Checklist

- [ ] Register a Meta Business App (Facebook Login + Instagram Graph API)
- [ ] Add a Facebook Page linked to an Instagram Business account
- [ ] Register a Twitter/X Developer Project with OAuth 2.0
- [ ] Configure redirect URIs in both developer consoles
- [ ] Set all env vars in `apps/api/.env`
- [ ] Restart the API
- [ ] Open `http://localhost:3000/integrations` and click a connect button
- [ ] Or test directly: browse to `http://localhost:4000/api/social/facebook/connect?workspaceId={id}&userId={id}`
- [ ] Verify the redirect back to `/integrations?success=true`
- [ ] Verify the connected account shows in the dashboard
