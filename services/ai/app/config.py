import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    app_name: str = "AISMOS AI Service"
    debug: bool = os.getenv("AI_DEBUG", "false").lower() == "true"
    port: int = int(os.getenv("AI_PORT", "8000"))
    host: str = os.getenv("AI_HOST", "0.0.0.0")
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv("AI_CORS_ORIGINS", "http://localhost:3000,http://localhost:4000").split(",")
    )

    # LLM provider settings
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_api_url: str = os.getenv("LLM_API_URL", "https://api.openai.com/v1")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    llm_fallback_model: str = os.getenv("LLM_FALLBACK_MODEL", "gpt-4o-mini")
    llm_max_retries: int = int(os.getenv("LLM_MAX_RETRIES", "3"))
    llm_timeout: int = int(os.getenv("LLM_TIMEOUT", "60"))

    # Embedding provider settings
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "openai")
    embedding_api_key: str = os.getenv("EMBEDDING_API_KEY", "")
    embedding_api_url: str = os.getenv("EMBEDDING_API_URL", "https://api.openai.com/v1")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))

    # Qdrant settings
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "brand_memory")

    # Redis settings
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")


settings = Settings()
