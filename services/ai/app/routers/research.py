import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    EngagementAnalysisRequest,
    EngagementAnalysisResponse,
    HashtagAnalysis,
    HashtagRechargeRequest,
    HashtagRechargeResponse,
    HashtagResearchRequest,
    HashtagResearchResponse,
    HashtagPool,
    PerformanceInsight,
)
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/research", tags=["research"])


@router.post("/hashtags", response_model=HashtagResearchResponse)
async def research_hashtags(request: HashtagResearchRequest):
    try:
        llm = create_llm_provider()
        hashtags_str = ", ".join(request.hashtags) if request.hashtags else "No existing hashtags provided"

        prompt = f"""You are AISMOS's hashtag research analyst. Analyze hashtags for {request.platform}.

Topic: {request.topic}
Industry: {request.industry or "general"}
Existing hashtags: {hashtags_str}

For each provided hashtag, assess:
1. Volume estimate (high/medium/low)
2. Competition level (high/medium/low)
3. Trend direction (rising/stable/declining)
4. Relevance score (0.0-1.0)
5. Recommendation: "use", "consider", or "avoid"

Then recommend 8-12 fresh hashtags that aren't in the existing list.

Return JSON with:
- "analyses": array of {{ "hashtag", "volume_estimate", "competition_level", "trend_direction", "relevance_score", "recommendation" }}
- "recommended": array of 8-12 recommended hashtag strings
- "avoid": array of hashtags to stop using
- "rationale": brief explanation of strategy"""

        result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are a hashtag research expert. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )

        raw_analyses = result.get("analyses", [])
        analyses = [
            HashtagAnalysis(
                hashtag=a.get("hashtag", ""),
                volume_estimate=a.get("volume_estimate", "medium"),
                competition_level=a.get("competition_level", "medium"),
                trend_direction=a.get("trend_direction", "stable"),
                relevance_score=float(a.get("relevance_score", 0.5)),
                recommendation=a.get("recommendation", "consider"),
            )
            for a in raw_analyses
        ]

        return HashtagResearchResponse(
            analyses=analyses,
            recommended=result.get("recommended", []),
            avoid=result.get("avoid", []),
            rationale=result.get("rationale", ""),
        )

    except Exception as e:
        logger.exception("Hashtag research failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/hashtags/recharge", response_model=HashtagRechargeResponse)
async def recharge_hashtags(request: HashtagRechargeRequest):
    try:
        brand_context = ""
        if request.brand_id:
            provider = create_embedding_provider()
            query_embedding = await provider.embed([f"hashtags brand identity {request.topic or request.platform}"])
            results = await vector_store.search_memory(
                query_embedding=query_embedding[0],
                brand_id=request.brand_id,
                limit=3,
            )
            brand_context = "\n".join(f"[{r['title']}] {r['content']}" for r in results)

        llm = create_llm_provider()
        current = ", ".join(request.current_hashtags) if request.current_hashtags else "None yet"

        prompt = f"""You are AISMOS's hashtag strategist. Generate a refreshed hashtag pool for {request.platform}.

Topic: {request.topic or "general brand content"}
Current hashtags: {current}
Brand context:
{brand_context or "No brand context."}

Generate {request.count} hashtags organized into these pools:
1. **primary** — high-volume, broad reach (2-4)
2. **secondary** — mid-volume, targeted (3-6)
3. **niche** — low-volume, highly specific (2-4)
4. **branded** — custom brand hashtags (1-3)
5. **seasonal** — timely/trending hashtags (1-3)

Also identify which current hashtags are deprecated and should be dropped.

Return JSON with:
- "pool": {{ "primary": [...], "secondary": [...], "niche": [...], "branded": [...], "seasonal": [...] }}
- "deprecated": array of hashtag strings to drop
- "rationale": strategy explanation"""

        result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are a hashtag strategy expert. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )

        raw_pool = result.get("pool", {})
        pool = HashtagPool(
            primary=raw_pool.get("primary", []),
            secondary=raw_pool.get("secondary", []),
            niche=raw_pool.get("niche", []),
            branded=raw_pool.get("branded", []),
            seasonal=raw_pool.get("seasonal", []),
        )

        return HashtagRechargeResponse(
            pool=pool,
            deprecated=result.get("deprecated", []),
            rationale=result.get("rationale", ""),
        )

    except Exception as e:
        logger.exception("Hashtag recharge failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/engagement/analyze", response_model=EngagementAnalysisResponse)
async def analyze_engagement(request: EngagementAnalysisRequest):
    try:
        records_text = ""
        for r in request.records:
            records_text += f"Post {r.post_id} ({r.platform}): ❤️{r.likes} 💬{r.comments} 🔄{r.shares} 👁️{r.impressions} 📈{r.engagement_rate}%\n"

        llm = create_llm_provider()

        prompt = f"""You are AISMOS's performance analyst. Analyze these engagement records for brand {request.brand_id}.

Platform: {request.platform}
Records ({len(request.records)} total):
{records_text}

Extract actionable insights:
1. **Best posting times** — what times/days get highest engagement
2. **Best content types** — what topics/formats perform best
3. **Hashtag performance** — which hashtags drive engagement
4. **Engagement patterns** — trends across the data

Return JSON with:
- "insights": array of {{
    "category": "best_time" | "best_content" | "hashtag_performance" | "engagement_pattern",
    "title": short label,
    "detail": explanation,
    "recommendation": action item,
    "confidence": 0.0-1.0
  }}
- "optimal_posting_times": array of 3-5 time recommendations
- "top_performing_hashtags": array of 5-10 hashtags
- "recommended_content_mix": array of 3-5 content category recommendations"""

        result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are a performance analytics engine. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )

        raw_insights = result.get("insights", [])
        insights = [
            PerformanceInsight(
                category=i.get("category", "engagement_pattern"),
                title=i.get("title", ""),
                detail=i.get("detail", ""),
                recommendation=i.get("recommendation", ""),
                confidence=float(i.get("confidence", 0.5)),
            )
            for i in raw_insights
        ]

        return EngagementAnalysisResponse(
            insights=insights,
            optimal_posting_times=result.get("optimal_posting_times", []),
            top_performing_hashtags=result.get("top_performing_hashtags", []),
            recommended_content_mix=result.get("recommended_content_mix", []),
        )

    except Exception as e:
        logger.exception("Engagement analysis failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
