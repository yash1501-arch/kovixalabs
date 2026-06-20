import { z } from "zod";

export const HealthCheckSchema = z.object({
  service: z.string().min(1),
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string().datetime(),
  dependencies: z.record(z.string()).optional()
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const BrandMemorySchema = z.object({
  targetAudience: z.string().min(1),
  toneOfVoice: z.string().min(1),
  contentPillars: z.array(z.string().min(1)).default([]),
  competitors: z.array(z.string().min(1)).default([]),
  restrictedTopics: z.array(z.string().min(1)).default([]),
  approvedClaims: z.array(z.string().min(1)).default([]),
  visualStyleNotes: z.string().optional()
});

export type BrandMemory = z.infer<typeof BrandMemorySchema>;

export const BrandProfileSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1)
  })
  .merge(BrandMemorySchema);

export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const BrandProfileRecordSchema = BrandMemorySchema.extend({
  id: z.string().min(1),
  brandId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type BrandProfileRecord = z.infer<typeof BrandProfileRecordSchema>;

export const BrandRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  profile: BrandProfileRecordSchema.nullable()
});

export type BrandRecord = z.infer<typeof BrandRecordSchema>;

export const RegisterRequestSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  workspaceName: z.string().min(1).max(120).optional()
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128)
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthWorkspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type AuthWorkspace = z.infer<typeof AuthWorkspaceSchema>;

export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
  user: AuthUserSchema,
  workspace: AuthWorkspaceSchema
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const BrandMemoryEntrySourceSchema = z.enum([
  "manual",
  "upload",
  "ai"
]);

export type BrandMemoryEntrySource = z.infer<
  typeof BrandMemoryEntrySourceSchema
>;

export const BrandMemoryEntryCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  source: BrandMemoryEntrySourceSchema.default("manual")
});

export type BrandMemoryEntryCreate = z.infer<
  typeof BrandMemoryEntryCreateSchema
>;

export const BrandMemoryEntryRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  source: BrandMemoryEntrySourceSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  score: z.number().min(0).max(1).optional()
});

export type BrandMemoryEntryRecord = z.infer<
  typeof BrandMemoryEntryRecordSchema
>;

export const BrandMemorySearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).default(5)
});

export type BrandMemorySearch = z.infer<typeof BrandMemorySearchSchema>;

export const CopyGenerationRequestSchema = z.object({
  brandId: z.string().min(1),
  platform: z.enum(["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"]),
  objective: z.string().min(1),
  topic: z.string().min(1),
  toneOverride: z.string().optional(),
  variants: z.number().int().min(1).max(10).default(3)
});

export type CopyGenerationRequest = z.infer<typeof CopyGenerationRequestSchema>;

export const AiTaskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled"
]);

export type AiTaskStatus = z.infer<typeof AiTaskStatusSchema>;

export const AiTaskCreateSchema = z.object({
  workspaceId: z.string().min(1),
  brandId: z.string().optional(),
  type: z.enum([
    "brand_memory_ingestion",
    "copy_generation",
    "trend_analysis",
    "image_generation",
    "publishing_recommendation",
    "analytics_summary"
  ]),
  input: z.record(z.unknown())
});

export type AiTaskCreate = z.infer<typeof AiTaskCreateSchema>;

export const AiTaskSchema = AiTaskCreateSchema.extend({
  id: z.string().min(1),
  status: AiTaskStatusSchema,
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type AiTask = z.infer<typeof AiTaskSchema>;

export const AiTaskRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  type: z.enum([
    "brand_memory_ingestion",
    "copy_generation",
    "trend_analysis",
    "image_generation",
    "publishing_recommendation",
    "analytics_summary"
  ]),
  status: AiTaskStatusSchema,
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  promptVersion: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().optional()
});

export type AiTaskRecord = z.infer<typeof AiTaskRecordSchema>;

export const PostStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "failed",
  "rejected"
]);

export type PostStatus = z.infer<typeof PostStatusSchema>;

export const CopyVariantSchema = z.object({
  id: z.string().min(1),
  caption: z.string().min(1),
  rationale: z.string().min(1)
});

export type CopyVariant = z.infer<typeof CopyVariantSchema>;

export const CopyGenerationResponseSchema = z.object({
  taskId: z.string().min(1),
  brandId: z.string().min(1),
  workspaceId: z.string().min(1),
  model: z.string().min(1),
  variants: z.array(CopyVariantSchema)
});

export type CopyGenerationResponse = z.infer<typeof CopyGenerationResponseSchema>;

// ── Social Accounts ──────────────────────────────────────────

export const SocialPlatformSchema = z.enum([
  "instagram",
  "instagram-basic",
  "linkedin",
  "x",
  "facebook",
  "tiktok",
  "youtube"
]);

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const SocialAccountRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  platform: SocialPlatformSchema,
  handle: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().optional(),
  connected: z.boolean(),
  connectedAt: z.string().datetime(),
  followerCount: z.number().int().min(0).optional(),
  accessToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  pageAccessToken: z.string().optional(),
  platformMetadata: z.record(z.any()).optional()
});

export type SocialAccountRecord = z.infer<typeof SocialAccountRecordSchema>;

export const SocialConnectRequestSchema = z.object({
  platform: SocialPlatformSchema,
  handle: z.string().min(1).max(120),
  displayName: z.string().min(1).max(120)
});

export type SocialConnectRequest = z.infer<typeof SocialConnectRequestSchema>;

// ── Hashtags ─────────────────────────────────────────────────

export const HashtagGenerationRequestSchema = z.object({
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  topic: z.string().min(1),
  caption: z.string().optional()
});

export type HashtagGenerationRequest = z.infer<typeof HashtagGenerationRequestSchema>;

export const HashtagSetSchema = z.object({
  trending: z.array(z.string()),
  niche: z.array(z.string()),
  branded: z.array(z.string())
});

export type HashtagSet = z.infer<typeof HashtagSetSchema>;

// ── Posts / Scheduling ────────────────────────────────────────

export const PostCreateSchema = z.object({
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  mediaUrls: z.array(z.string()).default([])
});

export type PostCreate = z.infer<typeof PostCreateSchema>;

export const PostRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  status: PostStatusSchema,
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type PostRecord = z.infer<typeof PostRecordSchema>;

// ── Analytics ─────────────────────────────────────────────────

export const AnalyticsOverviewSchema = z.object({
  workspaceId: z.string().min(1),
  period: z.enum(["7d", "30d", "90d"]),
  totalPosts: z.number().int(),
  publishedPosts: z.number().int(),
  scheduledPosts: z.number().int(),
  draftPosts: z.number().int(),
  totalImpressions: z.number().int(),
  totalEngagements: z.number().int(),
  totalReach: z.number().int(),
  engagementRate: z.number(),
  platformBreakdown: z.array(z.object({
    platform: SocialPlatformSchema,
    posts: z.number().int(),
    impressions: z.number().int(),
    engagements: z.number().int()
  })),
  dailyStats: z.array(z.object({
    date: z.string(),
    impressions: z.number().int(),
    engagements: z.number().int()
  }))
});

export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

// ── Dashboard Stats ───────────────────────────────────────────

export const DashboardStatsSchema = z.object({
  brands: z.number().int(),
  aiTasks: z.number().int(),
  draftPosts: z.number().int(),
  publishedPosts: z.number().int(),
  scheduledPosts: z.number().int(),
  connectedAccounts: z.number().int()
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ── Trend Engine ─────────────────────────────────────────────

export const TrendCategorySchema = z.enum(["viral", "industry", "niche", "evergreen"]);
export type TrendCategory = z.infer<typeof TrendCategorySchema>;

export const TrendVelocitySchema = z.enum(["rising", "peak", "declining"]);
export type TrendVelocity = z.infer<typeof TrendVelocitySchema>;

export const TrendRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  topic: z.string().min(1),
  platform: SocialPlatformSchema.nullable().optional(),
  category: TrendCategorySchema,
  score: z.number().min(0).max(100),
  velocity: TrendVelocitySchema,
  hashtags: z.array(z.string()),
  relatedTopics: z.array(z.string()),
  estimatedReach: z.number().int(),
  engagementPotential: z.enum(["high", "medium", "low"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type TrendRecord = z.infer<typeof TrendRecordSchema>;

// ── Image Generation ─────────────────────────────────────────

export const ImageAspectRatioSchema = z.enum(["1:1", "4:5", "16:9", "9:16"]);
export type ImageAspectRatio = z.infer<typeof ImageAspectRatioSchema>;

export const ImagePromptRequestSchema = z.object({
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  topic: z.string().min(1),
  style: z.string().optional(),
  aspectRatio: ImageAspectRatioSchema.default("1:1")
});
export type ImagePromptRequest = z.infer<typeof ImagePromptRequestSchema>;

export const ImagePromptRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  topic: z.string().min(1),
  style: z.string(),
  prompt: z.string().min(1),
  negativePrompt: z.string(),
  aspectRatio: ImageAspectRatioSchema,
  status: z.enum(["pending", "completed", "failed"]),
  imageUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime()
});
export type ImagePromptRecord = z.infer<typeof ImagePromptRecordSchema>;

// ── Content Planner ───────────────────────────────────────────

export const ContentPlanStatusSchema = z.enum(["draft", "active", "completed"]);
export type ContentPlanStatus = z.infer<typeof ContentPlanStatusSchema>;

export const ContentPlanItemStatusSchema = z.enum(["idea", "approved", "scheduled", "published"]);
export type ContentPlanItemStatus = z.infer<typeof ContentPlanItemStatusSchema>;

export const ContentPlanCreateSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1),
  platform: SocialPlatformSchema,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  postCount: z.number().int().min(1).max(60),
  themes: z.array(z.string()).default([])
});
export type ContentPlanCreate = z.infer<typeof ContentPlanCreateSchema>;

export const ContentPlanRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  name: z.string().min(1),
  platform: SocialPlatformSchema,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  postCount: z.number().int(),
  themes: z.array(z.string()),
  status: ContentPlanStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ContentPlanRecord = z.infer<typeof ContentPlanRecordSchema>;

export const ContentPlanItemRecordSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  day: z.number().int(),
  platform: SocialPlatformSchema,
  topic: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
  scheduledDate: z.string().min(1),
  status: ContentPlanItemStatusSchema
});
export type ContentPlanItemRecord = z.infer<typeof ContentPlanItemRecordSchema>;

// ─── PHASE 3: VIDEO AI ────────────────────────────────────────────────────────
export const VideoFormatSchema = z.enum(["reels", "tiktok", "youtube_short", "youtube_long", "story"]);
export const VideoStyleSchema = z.enum(["educational", "entertaining", "promotional", "storytelling"]);
export const VideoDurationSchema = z.enum(["15", "30", "60", "90"]);

export const VideoSceneSchema = z.object({
  sceneNumber: z.number().int(),
  duration: z.number().int(),
  visualDescription: z.string(),
  voiceover: z.string(),
  textOverlay: z.string(),
  cameraAngle: z.string()
});
export type VideoScene = z.infer<typeof VideoSceneSchema>;

export const VideoScriptRequestSchema = z.object({
  brandId: z.string().min(1),
  platform: VideoFormatSchema,
  topic: z.string().min(1).max(200),
  duration: VideoDurationSchema,
  style: VideoStyleSchema
});

export const VideoScriptRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  platform: VideoFormatSchema,
  topic: z.string().min(1),
  duration: z.number().int(),
  style: VideoStyleSchema,
  title: z.string(),
  hook: z.string(),
  scenes: z.array(VideoSceneSchema),
  cta: z.string(),
  hashtags: z.array(z.string()),
  createdAt: z.string().datetime()
});
export type VideoScriptRecord = z.infer<typeof VideoScriptRecordSchema>;

// ─── PHASE 3: MUSIC AI ────────────────────────────────────────────────────────
export const MusicMoodSchema = z.enum(["energetic", "calm", "inspirational", "playful", "dramatic", "corporate"]);
export const MusicGenreSchema = z.enum(["pop", "hip-hop", "electronic", "acoustic", "cinematic", "jazz", "lo-fi"]);

export const MusicTrackSchema = z.object({
  title: z.string(),
  artist: z.string(),
  genre: z.string(),
  bpm: z.number().int(),
  duration: z.string(),
  mood: z.string(),
  licenseType: z.string(),
  previewDescription: z.string()
});
export type MusicTrack = z.infer<typeof MusicTrackSchema>;

export const MusicSuggestionRequestSchema = z.object({
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  mood: MusicMoodSchema,
  genre: MusicGenreSchema.optional(),
  contentType: z.string().optional()
});

export const MusicSuggestionRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  mood: MusicMoodSchema,
  genre: z.string(),
  tracks: z.array(MusicTrackSchema),
  createdAt: z.string().datetime()
});
export type MusicSuggestionRecord = z.infer<typeof MusicSuggestionRecordSchema>;

// ─── PHASE 3: ADS ENGINE ─────────────────────────────────────────────────────
export const AdObjectiveSchema = z.enum(["awareness", "traffic", "engagement", "leads", "sales"]);
export const AdCampaignStatusSchema = z.enum(["draft", "active", "paused", "completed"]);

export const AdVariantSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  headline: z.string(),
  body: z.string(),
  cta: z.string(),
  imageStyle: z.string(),
  estimatedCtr: z.string()
});
export type AdVariant = z.infer<typeof AdVariantSchema>;

export const AdCampaignCreateSchema = z.object({
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  objective: AdObjectiveSchema,
  budget: z.number().positive(),
  durationDays: z.number().int().min(1).max(90),
  targetAudience: z.string().min(1),
  adCopy: z.string().optional()
});

export const AdCampaignRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  platform: SocialPlatformSchema,
  objective: AdObjectiveSchema,
  status: AdCampaignStatusSchema,
  budget: z.number(),
  spent: z.number(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  ctr: z.number(),
  cpc: z.number(),
  conversions: z.number().int(),
  targetAudience: z.string(),
  durationDays: z.number().int(),
  variants: z.array(AdVariantSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AdCampaignRecord = z.infer<typeof AdCampaignRecordSchema>;

// ─── PHASE 4: AGENT SWARM ────────────────────────────────────────────────────
export const AgentRoleSchema = z.enum(["coordinator", "content", "trend", "caption", "hashtag", "scheduler", "publisher"]);
export const AgentStatusSchema = z.enum(["idle", "queued", "running", "completed", "failed"]);
export const SwarmTaskTypeSchema = z.enum(["content_week", "trend_analysis", "campaign_create", "brand_audit", "hashtag_refresh"]);
export const SwarmTaskStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

export const SwarmAgentRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  taskId: z.string().min(1),
  role: AgentRoleSchema,
  status: AgentStatusSchema,
  progress: z.number().int().min(0).max(100),
  currentAction: z.string(),
  logs: z.array(z.string()),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type SwarmAgentRecord = z.infer<typeof SwarmAgentRecordSchema>;

export const SwarmTaskCreateSchema = z.object({
  type: SwarmTaskTypeSchema,
  brandId: z.string().min(1),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  input: z.record(z.string(), z.unknown()).default({})
});

export const SwarmTaskRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  type: SwarmTaskTypeSchema,
  status: SwarmTaskStatusSchema,
  priority: z.enum(["low", "normal", "high"]),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  agentCount: z.number().int(),
  completedAgents: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type SwarmTaskRecord = z.infer<typeof SwarmTaskRecordSchema>;

// ─── PHASE 4: AUTONOMOUS POSTING ─────────────────────────────────────────────
export const AutopilotConfigSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  enabled: z.boolean(),
  platforms: z.array(SocialPlatformSchema),
  postsPerWeek: z.number().int().min(1).max(21),
  preferredTimes: z.array(z.string()),
  contentStyle: z.enum(["educational", "entertaining", "promotional", "mixed"]),
  topicPreferences: z.array(z.string()),
  lastRanAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AutopilotConfig = z.infer<typeof AutopilotConfigSchema>;

export const AutopilotRunRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  configId: z.string().min(1),
  status: z.enum(["running", "completed", "failed"]),
  postsGenerated: z.number().int(),
  postsScheduled: z.number().int(),
  platforms: z.array(z.string()),
  summary: z.string(),
  createdAt: z.string().datetime()
});
export type AutopilotRunRecord = z.infer<typeof AutopilotRunRecordSchema>;

// ─── PHASE 4: LEARNING LOOP ───────────────────────────────────────────────────
export const LearningInsightTypeSchema = z.enum(["best_time", "top_topic", "best_style", "platform_tip", "engagement_pattern"]);

export const LearningInsightSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  platform: SocialPlatformSchema.nullable(),
  type: LearningInsightTypeSchema,
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  dataPoints: z.number().int(),
  recommendation: z.string(),
  createdAt: z.string().datetime()
});
export type LearningInsight = z.infer<typeof LearningInsightSchema>;

export const LearningProfileSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  bestPostingTimes: z.array(z.object({ day: z.string(), hour: z.number().int(), engagementScore: z.number() })),
  topPerformingTopics: z.array(z.string()),
  bestEngagingStyles: z.array(z.string()),
  avgEngagementRate: z.number(),
  totalPostsAnalyzed: z.number().int(),
  improvementScore: z.number().min(0).max(100),
  lastUpdatedAt: z.string().datetime()
});
export type LearningProfile = z.infer<typeof LearningProfileSchema>;

// ─── PHASE 5: FINE TUNING ────────────────────────────────────────────────────
export const DatasetStatusSchema = z.enum(["uploading", "processing", "ready", "failed"]);
export const FinetuneJobStatusSchema = z.enum(["queued", "running", "completed", "failed", "cancelled"]);
export const ModelDeployStatusSchema = z.enum(["training", "ready", "deployed", "archived"]);

export const FinetuneDatasetRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  exampleCount: z.number().int(),
  fileSizeKb: z.number().int(),
  status: DatasetStatusSchema,
  createdAt: z.string().datetime()
});
export type FinetuneDatasetRecord = z.infer<typeof FinetuneDatasetRecordSchema>;

export const FinetuneJobRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  datasetId: z.string().min(1),
  jobName: z.string().min(1),
  baseModel: z.string().min(1),
  status: FinetuneJobStatusSchema,
  progress: z.number().int().min(0).max(100),
  currentEpoch: z.number().int(),
  totalEpochs: z.number().int(),
  trainLoss: z.number().nullable(),
  valLoss: z.number().nullable(),
  accuracy: z.number().nullable(),
  estimatedSecondsRemaining: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type FinetuneJobRecord = z.infer<typeof FinetuneJobRecordSchema>;

export const FinetunedModelRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  brandId: z.string().min(1),
  jobId: z.string().min(1),
  name: z.string().min(1),
  baseModel: z.string().min(1),
  status: ModelDeployStatusSchema,
  accuracy: z.number(),
  inferenceLatencyMs: z.number().int(),
  totalInferences: z.number().int(),
  deployedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type FinetunedModelRecord = z.infer<typeof FinetunedModelRecordSchema>;

// ─── PHASE 5: MLOPS ───────────────────────────────────────────────────────────
export const ModelStageSchema = z.enum(["development", "staging", "production", "archived"]);

export const MlopsModelRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  stage: ModelStageSchema,
  baseModel: z.string().min(1),
  accuracy: z.number(),
  inferenceLatencyMs: z.number().int(),
  requestsPerDay: z.number().int(),
  errorRate: z.number(),
  brandId: z.string().min(1).nullable(),
  lastDeployedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type MlopsModelRecord = z.infer<typeof MlopsModelRecordSchema>;

export const ExperimentStatusSchema = z.enum(["running", "completed", "archived"]);
export const ExperimentRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  status: ExperimentStatusSchema,
  modelCount: z.number().int(),
  bestAccuracy: z.number().nullable(),
  bestLatencyMs: z.number().int().nullable(),
  metric: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ExperimentRecord = z.infer<typeof ExperimentRecordSchema>;

// ─── PHASE 5: ENTERPRISE SAAS ────────────────────────────────────────────────
export const TeamRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);
export const MemberStatusSchema = z.enum(["active", "invited", "suspended"]);

export const TeamMemberRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().email(),
  role: TeamRoleSchema,
  status: MemberStatusSchema,
  invitedAt: z.string().datetime(),
  joinedAt: z.string().datetime().nullable()
});
export type TeamMemberRecord = z.infer<typeof TeamMemberRecordSchema>;

export const BillingPlanSchema = z.enum(["free", "pro", "team", "enterprise"]);
export const BillingRecordSchema = z.object({
  workspaceId: z.string().min(1),
  plan: BillingPlanSchema,
  status: z.enum(["active", "past_due", "cancelled", "trialing"]),
  seats: z.number().int(),
  usedSeats: z.number().int(),
  billingCycle: z.enum(["monthly", "annual"]),
  nextBillingDate: z.string().datetime().nullable(),
  amountCents: z.number().int(),
  currency: z.string()
});
export type BillingRecord = z.infer<typeof BillingRecordSchema>;

export const UsagePeriodRecordSchema = z.object({
  workspaceId: z.string().min(1),
  period: z.string(),
  aiGenerations: z.number().int(),
  postsScheduled: z.number().int(),
  postsPublished: z.number().int(),
  apiCalls: z.number().int(),
  storageUsedMb: z.number(),
  limits: z.object({
    aiGenerations: z.number().int(),
    postsScheduled: z.number().int(),
    apiCalls: z.number().int(),
    storageUsedMb: z.number()
  })
});
export type UsagePeriodRecord = z.infer<typeof UsagePeriodRecordSchema>;

export const AuditLogRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  userEmail: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  details: z.string(),
  ipAddress: z.string(),
  createdAt: z.string().datetime()
});
export type AuditLogRecord = z.infer<typeof AuditLogRecordSchema>;
