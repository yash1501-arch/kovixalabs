# Tomorrow's Plan

## ✅ Built

| What | Files |
|---|---|
| Missing audit endpoint | Added `GET /workspaces/:workspaceId/social-accounts/:id/audit` to `social-routes.ts:55`, handler in `audit-controller.ts:24`, service `runSocialAccountAudit()` in `audit-service.ts` with strengths/opportunities scoring |
| instagram-basic scraper | Added `scrapeInstagramBasic()` to `platform-scrapers.ts` — uses Instagram Basic Display API `/me/media` |
| Env vars | Added `LINKEDIN_CLIENT_ID`, `TIKTOK_CLIENT_KEY`, `TWITTER_CLIENT_ID`, `YOUTUBE_CLIENT_ID` + secrets/redirects to `.env` |
| db.ts → lib/prisma.ts | Re-wired `db.ts` to re-export the adapter-based PrismaClient from `lib/prisma.ts` so all existing services use the `PrismaPg` adapter |
| Build | TypeScript compiles clean (`npx tsc -p apps/api/tsconfig.json`) |

## 🔑 Need To Do

1. **Fill in social API credentials** — Add your actual app keys to `.env` for each platform you want to use:
   - `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
   - `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`
   - `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`
   - `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`

2. **Connect flow works now** — After filling credentials, the OAuth flow at `/integrations` will work end-to-end:
   - Click "Connect" → OAuth redirect → callback → account saved to DB
   - "Audit Profile" button now calls the endpoint I built and shows strengths/opportunities/score

3. **Auto-research on connect** — Still missing: when a social account connects, there's no trigger to auto-scrape/populate brand memory. Want me to build that next?

## 🔐 Where to get each set of credentials

### Meta (Facebook + Instagram via Facebook)
You already have these — `META_APP_ID` / `META_APP_SECRET` are filled in. These come from the [Facebook Developer Portal](https://developers.facebook.com/apps) → Create App → "Business" type → Products → Facebook Login + Instagram Graph API.

### Instagram Basic (standalone)
Reuses the same `META_APP_ID` / `META_APP_SECRET` — nothing extra needed.

### LinkedIn
1. Go to https://www.linkedin.com/developers/apps → Create App
2. Add the **Sign In with LinkedIn** product
3. Under **Auth**, set OAuth 2.0 redirect URL to `http://localhost:4000/api/social/linkedin/callback`
4. Copy **Client ID** → `LINKEDIN_CLIENT_ID`, **Client Secret** → `LINKEDIN_CLIENT_SECRET`

### TikTok
1. Go to https://developers.tiktok.com/apps → Create App
2. Add the **Login Kit** and **Video Kit** capabilities
3. Under **Basic Info**, set redirect URL to `http://localhost:4000/api/social/tiktok/callback`
4. Copy **Client Key** → `TIKTOK_CLIENT_KEY`, **Client Secret** → `TIKTOK_CLIENT_SECRET`

### X / Twitter
1. Go to https://developer.twitter.com/en/portal/projects-and-apps → Create App
2. Under **User authentication settings**, enable OAuth 2.0, set type to **Confidential**, redirect URL to `http://localhost:4000/api/social/twitter/callback`
3. Copy **OAuth 2.0 Client ID** → `TWITTER_CLIENT_ID`, **Client Secret** → `TWITTER_CLIENT_SECRET`

### YouTube
1. Go to https://console.cloud.google.com/ → Create or pick a project
2. **APIs & Services** → **Library** → Enable **YouTube Data API v3**
3. **Credentials** → Create **OAuth 2.0 Client ID** → Application type **Web application**
4. Add redirect URL `http://localhost:4000/api/social/youtube/callback`
5. Copy **Client ID** → `YOUTUBE_CLIENT_ID`, **Client Secret** → `YOUTUBE_CLIENT_SECRET`

Paste each into `.env`, then restart the API server and the connect buttons on `/integrations` will work.
