import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key
from pydantic import BaseModel, Field

from app.models.schemas import ModelOverride
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["audit"], dependencies=[Depends(verify_api_key)])


class ScrapedPostItem(BaseModel):
    id: str
    caption: str
    hashtags: list[str] = Field(default_factory=list)
    likes: int = 0
    comments: int = 0
    shares: int = 0


class PlatformAuditData(BaseModel):
    platform: str
    username: str
    display_name: str
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    recent_posts: list[ScrapedPostItem] = Field(default_factory=list)


class AuditAnalysisRequest(BaseModel):
    workspace_id: str
    brand_id: str
    profiles: list[PlatformAuditData]
    model_override: ModelOverride | None = None


class AuditInsight(BaseModel):
    id: str
    title: str
    content: str
    tags: list[str]


class AuditAnalysisResponse(BaseModel):
    insights: list[AuditInsight]


@router.post("/analyze", response_model=AuditAnalysisResponse)
async def analyze_audit(request: AuditAnalysisRequest):
    try:
        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )

        profiles_text = ""
        for p in request.profiles:
            posts_text = ""
            for post in p.recent_posts[:5]:
                posts_text += f"  - {post.caption[:150]} (❤️{post.likes} 💬{post.comments} 🔄{post.shares})\n"

            profiles_text += f"""
Platform: {p.platform}
Username: {p.username}
Display Name: {p.display_name}
Followers: {p.follower_count}
Recent Posts:
{posts_text}
"""

        prompt = f"""You are AISMOS's brand audit analyst. Analyze the following social media profiles and extract strategic brand insights.

{profiles_text}

For each profile, extract:
1. **Brand voice assessment** — consistent tone? Professional? Casual? Authoritative?
2. **Content theme discovery** — what topics/themes appear most?
3. **Engagement patterns** — which post types get highest engagement?
4. **Strengths** — what's working well
5. **Opportunities** — what could be improved
6. **Competitor positioning** — inferred from content

Return JSON with an "insights" array. Each insight has "title" (short label), "content" (detailed analysis), and "tags" (array of category labels like "voice", "content", "engagement", "strength", "opportunity"). Generate 3-6 insights total."""

        result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are AISMOS brand audit analyst. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )

        raw_insights = result.get("insights", [])

        provider = create_embedding_provider()
        insights: list[AuditInsight] = []

        for raw in raw_insights:
            title = raw.get("title", "Brand Insight")
            content = raw.get("content", "")
            tags = raw.get("tags", ["audit"])
            insight_id = str(uuid4())

            text_to_embed = f"{title}\n{content}"
            embeddings = await provider.embed([text_to_embed])

            await vector_store.upsert_memory(
                entry_id=insight_id,
                embedding=embeddings[0],
                payload={
                    "workspace_id": request.workspace_id,
                    "brand_id": request.brand_id,
                    "title": title,
                    "content": content,
                    "tags": tags + ["audit", "ai_analysis"],
                    "source": "audit_analysis",
                },
            )

            insights.append(AuditInsight(
                id=insight_id,
                title=title,
                content=content,
                tags=tags,
            ))

        logger.info("Audit analysis complete: %d insights for brand=%s", len(insights), request.brand_id)
        return AuditAnalysisResponse(insights=insights)

    except Exception as e:
        logger.exception("Audit analysis failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
