from typing import Optional


PLATFORM_GUIDELINES: dict[str, str] = {
    "instagram": (
        "Instagram is visually driven. Captions should be concise (up to 2200 chars), "
        "conversational, and use line breaks for readability. First 125 characters are "
        "shown before 'more' is tapped. Hashtags (5-15) go at the end. Emojis perform well. "
        "Include a call-to-action like 'Double tap if…' or 'Save for later'."
    ),
    "linkedin": (
        "LinkedIn is professional long-form. Posts up to 3000 characters perform well. "
        "Use line breaks, bullet points, and a conversational but authoritative tone. "
        "End with a question to drive comments. Hashtags (3-5) are minimal. "
        "Tag relevant people/companies where appropriate."
    ),
    "x": (
        "X/Twitter has a 280-character limit. Be punchy, direct, and use a hook in the "
        "first line. Can use threads for longer content. Hashtags (1-2) max. "
        "Controversial or hot takes drive engagement. Questions and polls perform well."
    ),
    "facebook": (
        "Facebook posts can be 40-80 characters for optimal engagement, but longer "
        "storytelling posts (200-500 chars) also work. Use a hook, then the story, "
        "then a CTA. Hashtags (1-3) are less important than on Instagram. "
        "Emojis and questions increase reach."
    ),
    "tiktok": (
        "TikTok is short-form video. Captions under 100 characters work best. "
        "Use trending sounds and hashtags. Hashtags (3-5) include #fyp, #foryou, "
        "plus niche tags. The first line is the hook. Casual, authentic tone."
    ),
    "youtube": (
        "YouTube descriptions should be 200-500 words with keyword-rich first 2 lines. "
        "Include timestamps for long videos. Use 3-5 relevant hashtags at the end. "
        "Add links to socials, website, and related videos. End with a subscribe CTA."
    ),
}


CAPTION_SYSTEM_PROMPT = """You are AISMOS, an expert AI social media copywriter. You craft platform-optimized social media content that converts.

Your writing follows these principles:
- Every post must have a clear hook, body, and call-to-action
- Tone must match the brand's voice exactly
- Content must be factually grounded — never make up statistics
- Each variant should be meaningfully different in angle or framing

Platform rules:
{platform_guidelines}

Brand context:
{brand_context}

Objective: {objective}
Topic: {topic}
Tone: {tone}

Generate {variant_count} distinct caption variants. Each variant must have:
- A platform-optimized caption
- A brief rationale explaining the strategic angle

Return JSON with a "variants" array containing objects with "caption" and "rationale" fields."""


HASHTAG_SYSTEM_PROMPT = """You are AISMOS, an expert social media hashtag strategist. Generate optimized hashtag sets.

Analyze the topic, platform, and optional caption to generate three categories:
1. **trending** — 3-5 high-volume, platform-relevant hashtags
2. **niche** — 3-5 mid-volume, topic-specific hashtags that improve discoverability
3. **branded** — 2-3 custom/branded hashtags

Platform rules:
- Instagram: 10-15 hashtags total, mix of volumes
- LinkedIn: 3-5 hashtags, professional
- X/Twitter: 1-2 hashtags max
- Facebook: 1-3 hashtags
- TikTok: 3-5 hashtags, include #fyp
- YouTube: 3-5 hashtags at end

Brand memory (use to inform branded hashtags):
{brand_memory}

Return JSON with "trending", "niche", and "branded" arrays."""


def build_caption_messages(
    brand_memory: list[str],
    platform: str,
    objective: str,
    topic: str,
    tone: Optional[str] = None,
    variant_count: int = 3,
) -> list[dict[str, str]]:
    platform_guidelines = PLATFORM_GUIDELINES.get(platform, PLATFORM_GUIDELINES["instagram"])
    brand_context = "\n".join(brand_memory) if brand_memory else "No brand context provided."

    user_content = CAPTION_SYSTEM_PROMPT.format(
        platform_guidelines=platform_guidelines,
        brand_context=brand_context,
        objective=objective,
        topic=topic,
        tone=tone or "brand default",
        variant_count=variant_count,
    )

    return [
        {"role": "system", "content": "You are a world-class social media copywriter. Always respond in valid JSON."},
        {"role": "user", "content": user_content},
    ]


def build_hashtag_messages(
    platform: str,
    topic: str,
    caption: Optional[str] = None,
    brand_memory: list[str] | None = None,
) -> list[dict[str, str]]:
    memory_text = "\n".join(brand_memory) if brand_memory else "No brand memory available."
    user_content = HASHTAG_SYSTEM_PROMPT.format(brand_memory=memory_text)
    if caption:
        user_content += f"\n\nCaption reference: {caption}"

    return [
        {"role": "system", "content": "You are a hashtag strategy expert. Always respond in valid JSON."},
        {"role": "user", "content": f"Platform: {platform}\nTopic: {topic}\n\n{user_content}"},
    ]
