from pydantic import BaseModel, Field
from typing import Optional


class ModelOverride(BaseModel):
    """Optional model configuration override sent from the API layer."""
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class CopyVariant(BaseModel):
    id: str
    caption: str
    rationale: str


class CopyGenerationRequest(BaseModel):
    brand_id: str
    platform: str
    objective: str
    topic: str
    tone: Optional[str] = None
    brand_memory: list[str] = Field(default_factory=list)
    variants: int = Field(default=3, ge=1, le=10)
    model_override: Optional[ModelOverride] = None


class CopyGenerationResponse(BaseModel):
    task_id: str
    model: str
    variants: list[CopyVariant]


class HashtagGenerationRequest(BaseModel):
    brand_id: str
    platform: str
    topic: str
    caption: Optional[str] = None
    model_override: Optional[ModelOverride] = None


class HashtagSet(BaseModel):
    trending: list[str]
    niche: list[str]
    branded: list[str]


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int


class BrandMemorySearchRequest(BaseModel):
    query: str
    limit: int = Field(default=5, ge=1, le=20)
    workspace_id: Optional[str] = None
    brand_id: Optional[str] = None


class BrandMemorySearchResult(BaseModel):
    id: str
    title: str
    content: str
    tags: list[str]
    score: float


class BrandMemorySearchResponse(BaseModel):
    results: list[BrandMemorySearchResult]


class MemoryIngestRequest(BaseModel):
    entry_id: str
    workspace_id: str
    brand_id: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    source: str = "manual"


class MemoryIngestResponse(BaseModel):
    status: str
    entry_id: str


class MemoryDeleteRequest(BaseModel):
    entry_id: str


class MemoryDeleteResponse(BaseModel):
    status: str
    entry_id: str


class ContentFeedbackRequest(BaseModel):
    post_id: str
    workspace_id: str
    brand_id: str
    platform: str
    caption: str
    hashtags: list[str] = Field(default_factory=list)
    media_urls: list[str] = Field(default_factory=list)
    engagement: dict = Field(default_factory=dict)
    performance_score: float = 0.0
    model_override: Optional[ModelOverride] = None


class ContentFeedbackResponse(BaseModel):
    status: str
    memory_entries_created: int
    insights: list[str] = Field(default_factory=list)


class ImageGenerationRequest(BaseModel):
    brand_id: str
    prompt: str
    style: Optional[str] = None
    aspect_ratio: str = "1:1"
    count: int = Field(default=1, ge=1, le=4)
    model_override: Optional[ModelOverride] = None


class ImageGenerationResponse(BaseModel):
    task_id: str
    images: list[str]


class VideoScriptScene(BaseModel):
    scene_number: int
    duration_seconds: int
    visual_description: str
    spoken_text: str
    on_screen_text: Optional[str] = None


class VideoScriptRequest(BaseModel):
    brand_id: str
    platform: str
    topic: str
    duration_seconds: int = 30
    style: Optional[str] = None
    cta: Optional[str] = None
    model_override: Optional[ModelOverride] = None


class VideoScriptResponse(BaseModel):
    task_id: str
    title: str
    hook: str
    scenes: list[VideoScriptScene]
    cta: str
    hashtags: list[str]


class BatchContentRequest(BaseModel):
    brand_id: str
    platform: str
    topic: str
    objective: str = "awareness"
    tone: Optional[str] = None
    generate_images: bool = False
    generate_video_script: bool = False
    variant_count: int = 3
    model_override: Optional[ModelOverride] = None


class BatchContentVariant(BaseModel):
    id: str
    caption: str
    rationale: str
    hashtags: list[str]
    image_url: Optional[str] = None


class BatchContentResponse(BaseModel):
    task_id: str
    model: str
    brand_id: str
    platform: str
    topic: str
    variants: list[BatchContentVariant]
    video_script: Optional[VideoScriptResponse] = None


class HashtagResearchRequest(BaseModel):
    hashtags: list[str] = Field(default_factory=list)
    topic: str
    platform: str
    industry: Optional[str] = None
    brand_id: Optional[str] = None
    model_override: Optional[ModelOverride] = None


class HashtagAnalysis(BaseModel):
    hashtag: str
    volume_estimate: str  # "high" | "medium" | "low"
    competition_level: str  # "high" | "medium" | "low"
    trend_direction: str  # "rising" | "stable" | "declining"
    relevance_score: float = Field(ge=0, le=1)
    recommendation: str  # "use" | "consider" | "avoid"


class HashtagResearchResponse(BaseModel):
    analyses: list[HashtagAnalysis]
    recommended: list[str]
    avoid: list[str]
    rationale: str


class HashtagRechargeRequest(BaseModel):
    brand_id: str
    platform: str
    current_hashtags: list[str] = Field(default_factory=list)
    topic: Optional[str] = None
    count: int = Field(default=10, ge=5, le=30)
    model_override: Optional[ModelOverride] = None


class HashtagPool(BaseModel):
    primary: list[str]
    secondary: list[str]
    niche: list[str]
    branded: list[str]
    seasonal: list[str]


class HashtagRechargeResponse(BaseModel):
    pool: HashtagPool
    deprecated: list[str]
    rationale: str


class EngagementRecord(BaseModel):
    post_id: str
    platform: str
    likes: int = 0
    comments: int = 0
    shares: int = 0
    impressions: int = 0
    reach: int = 0
    saves: int = 0
    engagement_rate: float = 0.0
    posted_at: str


class EngagementAnalysisRequest(BaseModel):
    brand_id: str
    platform: str
    records: list[EngagementRecord] = Field(default_factory=list)
    model_override: Optional[ModelOverride] = None


class PerformanceInsight(BaseModel):
    category: str  # "best_time" | "best_content" | "hashtag_performance" | "engagement_pattern"
    title: str
    detail: str
    recommendation: str
    confidence: float = Field(ge=0, le=1)


class EngagementAnalysisResponse(BaseModel):
    insights: list[PerformanceInsight]
    optimal_posting_times: list[str]
    top_performing_hashtags: list[str]
    recommended_content_mix: list[str]


class VoiceoverRequest(BaseModel):
    text: str
    voice: str = "nova"
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    format: str = "mp3"
    model_override: Optional[ModelOverride] = None


class VoiceoverResponse(BaseModel):
    task_id: str
    audio_url: str
    duration_seconds: float
    format: str


class SubtitleScene(BaseModel):
    scene_number: int
    spoken_text: str
    start_seconds: float
    end_seconds: float


class SubtitleRequest(BaseModel):
    scenes: list[SubtitleScene]
    format: str = "srt"
    max_line_length: int = 42


class SubtitleResponse(BaseModel):
    content: str
    format: str
    total_duration_seconds: float


class VideoRenderRequest(BaseModel):
    workspace_id: str
    brand_id: str
    title: str
    scenes: list[VideoScriptScene]
    hooks: Optional[str] = None
    cta: str = "Follow for more"
    hashtags: list[str] = Field(default_factory=list)
    background_music_url: Optional[str] = None


class VideoRenderResponse(BaseModel):
    task_id: str
    status: str
    video_url: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: str
    dependencies: dict[str, str]


# ─── News Scraper ──────────────────────────────────────────────

class NewsScrapeRequest(BaseModel):
    url: str
    max_articles: int = Field(default=20, ge=1, le=100)


class NewsArticleItem(BaseModel):
    title: str
    url: str
    content: Optional[str] = None
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    image_url: Optional[str] = None


class NewsScrapeResponse(BaseModel):
    source_url: str
    articles: list[NewsArticleItem]


class NewsAnalyzeRequest(BaseModel):
    articles: list[NewsArticleItem]
    brand_context: Optional[str] = None
    model_override: Optional[ModelOverride] = None


class NewsAnalysisItem(BaseModel):
    url: str
    title: str
    summary: str
    keywords: list[str]
    relevance_score: float = Field(ge=0, le=1)
    sentiment: str  # "positive" | "negative" | "neutral"


class NewsAnalyzeResponse(BaseModel):
    analyses: list[NewsAnalysisItem]


# ─── Face Swap ─────────────────────────────────────────────────

class FaceSwapAnalyzeRequest(BaseModel):
    source_image_url: str
    target_image_url: str
    brand_context: Optional[str] = None
    model_override: Optional[ModelOverride] = None


class FaceSwapAnalyzeResponse(BaseModel):
    compatible: bool
    confidence: float = Field(ge=0, le=1)
    recommendations: list[str]
    parameters: dict[str, object] = Field(default_factory=dict)


# ─── Swarm ───────────────────────────────────────────────────

class SwarmAgentDefinition(BaseModel):
    agent_id: str
    role: str
    action: str


class SwarmExecuteRequest(BaseModel):
    task_id: str
    task_type: str
    agents: list[SwarmAgentDefinition]
    brand_context: Optional[str] = None
    brand_memory: list[str] = Field(default_factory=list)
    platform: Optional[str] = None
    model_override: Optional[ModelOverride] = None


class SwarmAgentResult(BaseModel):
    agent_id: str
    role: str
    status: str
    result: str
    details: str = ""


class SwarmExecuteResponse(BaseModel):
    task_id: str
    task_type: str
    agent_count: int
    completed_count: int
    agents: list[SwarmAgentResult]
