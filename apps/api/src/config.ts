import dotenv from "dotenv";

dotenv.config();

function assertNonEmpty(key: string, value: string): void {
  if (!value) {
    throw new Error(
      `Environment variable ${key} is required but was not set. ` +
      "This is a security requirement. Please set it before starting the server."
    );
  }
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return value;
}

function readString(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: readString("NODE_ENV", "development"),
  port: readNumber("API_PORT", 4000),
  corsOrigin: readString("API_CORS_ORIGIN", "http://localhost:3000"),
  aiServiceUrl: readString("AI_SERVICE_URL", "http://localhost:8000"),
  databaseUrl: readString(
    "DATABASE_URL",
    "postgresql://aismos:aismos@localhost:5432/aismos?schema=public"
  ),
  mongoUrl: readString("MONGODB_URL", "mongodb://localhost:27017/aismos"),
  redisUrl: readString("REDIS_URL", "redis://localhost:6379"),
  qdrantUrl: readString("QDRANT_URL", "http://localhost:6333"),
  metaAppId: readString("META_APP_ID", ""),
  metaAppSecret: readString("META_APP_SECRET", ""),
  metaRedirectUri: readString(
    "META_REDIRECT_URI",
    "http://localhost:4000/api/social/{platform}/callback"
  ),
  metaGraphApiVersion: readString("META_GRAPH_API_VERSION", "v22.0"),
  encryptionSecret: readString("ENCRYPTION_SECRET", ""),
  metaOAuthScopes: readString(
    "META_OAUTH_SCOPES",
    "instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list,pages_manage_metadata,business_management"
  ),
  linkedinClientId: readString("LINKEDIN_CLIENT_ID", ""),
  linkedinClientSecret: readString("LINKEDIN_CLIENT_SECRET", ""),
  linkedinRedirectUri: readString("LINKEDIN_REDIRECT_URI", "http://localhost:4000/api/social/linkedin/callback"),
  tiktokClientKey: readString("TIKTOK_CLIENT_KEY", ""),
  tiktokClientSecret: readString("TIKTOK_CLIENT_SECRET", ""),
  tiktokRedirectUri: readString("TIKTOK_REDIRECT_URI", "http://localhost:4000/api/social/tiktok/callback"),
  twitterClientId: readString("TWITTER_CLIENT_ID", ""),
  twitterClientSecret: readString("TWITTER_CLIENT_SECRET", ""),
  twitterRedirectUri: readString("TWITTER_REDIRECT_URI", "http://localhost:4000/api/social/twitter/callback"),
  youtubeClientId: readString("YOUTUBE_CLIENT_ID", ""),
  youtubeClientSecret: readString("YOUTUBE_CLIENT_SECRET", ""),
  youtubeRedirectUri: readString("YOUTUBE_REDIRECT_URI", "http://localhost:4000/api/social/youtube/callback"),
  instagramBasicRedirectUri: readString(
    "INSTAGRAM_BASIC_REDIRECT_URI",
    "http://localhost:4000/api/social/instagram-basic/callback"
  ),
  internalAuthToken: readString("INTERNAL_AUTH_TOKEN", ""),
};

assertNonEmpty("ENCRYPTION_SECRET", env.encryptionSecret);
assertNonEmpty("INTERNAL_AUTH_TOKEN", env.internalAuthToken);
