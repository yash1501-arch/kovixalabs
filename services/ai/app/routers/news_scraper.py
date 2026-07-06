import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends

from app.middleware.auth import verify_api_key

from app.models.schemas import (
    NewsScrapeRequest,
    NewsScrapeResponse,
    NewsArticleItem,
    NewsAnalyzeRequest,
    NewsAnalyzeResponse,
    NewsAnalysisItem,
)
from app.services.llm import create_llm_provider

logger = logging.getLogger(__name__)

router = APIRouter(tags=["news"], dependencies=[Depends(verify_api_key)])


@router.post("/news/scrape", response_model=NewsScrapeResponse)
async def scrape_news(request: NewsScrapeRequest):
    """Fetch and parse articles from an RSS/Atom feed URL."""
    import httpx

    articles: list[NewsArticleItem] = []

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(request.url, headers={
                "User-Agent": "AISMOS-NewsBot/1.0",
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
            })
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            text = resp.text
    except Exception as e:
        logger.warning("Failed to fetch feed %s: %s", request.url, e)
        return NewsScrapeResponse(source_url=request.url, articles=[])

    import xml.etree.ElementTree as ET

    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return NewsScrapeResponse(source_url=request.url, articles=[])

    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "dc": "http://purl.org/dc/elements/1.1/",
        "content": "http://purl.org/rss/1.0/modules/content/",
    }

    entries: list[tuple[ET.Element, str]] = []

    for item in root.iter("item"):
        entries.append((item, "rss"))
    for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
        entries.append((entry, "atom"))

    for el, fmt in entries:
        if len(articles) >= request.max_articles:
            break
        try:
            if fmt == "rss":
                title_el = el.find("title")
                title = title_el.text if title_el is not None else "Untitled"
                link_el = el.find("link")
                url = link_el.text if link_el is not None else ""
                desc_el = el.find("description")
                content = desc_el.text if desc_el is not None else None
                content_enc = el.find("content:encoded", ns)
                if content_enc is not None and content_enc.text:
                    content = content_enc.text
                author_el = el.find("author") or el.find("dc:creator", ns)
                author = author_el.text if author_el is not None else None
                pub_el = el.find("pubDate") or el.find("dc:date", ns)
                pub_date = pub_el.text if pub_el is not None else None
                img_el = el.find("enclosure")
                img_url = img_el.attrib.get("url") if img_el is not None and img_el.attrib.get("type", "").startswith("image") else None
            else:
                title_el = el.find("{http://www.w3.org/2005/Atom}title")
                title = title_el.text if title_el is not None else "Untitled"
                link_el = el.find("{http://www.w3.org/2005/Atom}link")
                url = link_el.attrib.get("href", "") if link_el is not None else ""
                content_el = el.find("{http://www.w3.org/2005/Atom}content") or el.find("{http://www.w3.org/2005/Atom}summary")
                content = content_el.text if content_el is not None else None
                author_el = el.find("{http://www.w3.org/2005/Atom}author/{http://www.w3.org/2005/Atom}name")
                author = author_el.text if author_el is not None else None
                pub_el = el.find("{http://www.w3.org/2005/Atom}published") or el.find("{http://www.w3.org/2005/Atom}updated")
                pub_date = pub_el.text if pub_el is not None else None
                img_el = el.find("{http://www.w3.org/2005/Atom}link[@rel='enclosure']")
                img_url = img_el.attrib.get("href") if img_el is not None else None

            if not url:
                continue

            articles.append(NewsArticleItem(
                title=title.strip() if title else "Untitled",
                url=url.strip(),
                content=content.strip() if content else None,
                summary=None,
                author=author.strip() if author else None,
                published_at=pub_date.strip() if pub_date else None,
                image_url=img_url.strip() if img_url else None,
            ))
        except Exception as e:
            logger.debug("Skipping entry: %s", e)
            continue

    return NewsScrapeResponse(source_url=request.url, articles=articles)


@router.post("/news/analyze", response_model=NewsAnalyzeResponse)
async def analyze_news(request: NewsAnalyzeRequest):
    """Analyze news articles for brand relevance, sentiment, and keywords."""
    mo = request.model_override
    llm = create_llm_provider(
        api_key=mo.api_key if mo else "",
        api_url=mo.api_url if mo else "",
        model=mo.model if mo else "",
        provider=mo.provider if mo else "",
    )
    brand_context = request.brand_context or ""
    articles = request.articles

    analyses: list[NewsAnalysisItem] = []
    for article in articles:
        text = article.content or article.summary or article.title
        if not text:
            continue

        messages = [
            {"role": "system", "content": "You are an expert brand intelligence analyst. Analyze news articles for relevance to the brand context. Respond in valid JSON."},
            {"role": "user", "content": f"""Analyze this article for brand relevance:

Brand context: {brand_context}

Title: {article.title}
Content: {text[:3000]}

Respond with this exact JSON structure:
{{
  "summary": "2-3 sentence summary",
  "keywords": ["keyword1", "keyword2", ...],
  "relevance_score": 0.0-1.0,
  "sentiment": "positive|negative|neutral"
}}"""},
        ]

        try:
            result = await llm.chat_json(messages)
            analyses.append(NewsAnalysisItem(
                url=article.url,
                title=article.title,
                summary=result.get("summary", text[:200]),
                keywords=result.get("keywords", []),
                relevance_score=float(result.get("relevance_score", 0.5)),
                sentiment=result.get("sentiment", "neutral"),
            ))
        except Exception as e:
            logger.warning("Failed to analyze article %s: %s", article.title, e)
            analyses.append(NewsAnalysisItem(
                url=article.url,
                title=article.title,
                summary=text[:200],
                keywords=[],
                relevance_score=0.5,
                sentiment="neutral",
            ))

    return NewsAnalyzeResponse(analyses=analyses)
