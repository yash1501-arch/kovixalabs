import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    pass


class EmbeddingProvider:
    def __init__(
        self,
        api_key: str = "",
        api_url: str = "",
        model: str = "",
        dimensions: int = 1536,
    ):
        self.api_key = api_key or settings.embedding_api_key
        self.api_url = api_url or settings.embedding_api_url
        self.model = model or settings.embedding_model
        self.dimensions = dimensions or settings.embedding_dimensions

    async def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.api_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "input": texts,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return [item["embedding"] for item in data["data"]]
        except httpx.HTTPStatusError as e:
            raise EmbeddingError(f"Embedding API error: {e.response.status_code} {e.response.text}") from e
        except Exception as e:
            raise EmbeddingError(f"Embedding failed: {e}") from e


def create_embedding_provider() -> EmbeddingProvider:
    return EmbeddingProvider()
