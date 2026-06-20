import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, url: str = "", collection: str = ""):
        self.url = url or settings.qdrant_url
        self.collection = collection or settings.qdrant_collection
        self.client: Optional[QdrantClient] = None

    async def initialize(self):
        try:
            self.client = QdrantClient(url=self.url, timeout=3)
            await self._ensure_collection()
            logger.info("Qdrant connected — collection '%s' ready", self.collection)
        except Exception as e:
            logger.warning("Qdrant not available (%s) — running in degraded mode", e)
            self.client = None

    async def _ensure_collection(self):
        try:
            collections = self.client.get_collections()
            existing = [c.name for c in collections.collections]
            if self.collection in existing:
                logger.info("Collection '%s' already exists", self.collection)
                return
        except UnexpectedResponse:
            logger.warning("Could not list collections, attempting creation")

        self.client.create_collection(
            collection_name=self.collection,
            vectors_config=models.VectorParams(
                size=settings.embedding_dimensions,
                distance=models.Distance.COSINE,
            ),
        )
        self.client.create_payload_index(
            collection_name=self.collection,
            field_name="brand_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        self.client.create_payload_index(
            collection_name=self.collection,
            field_name="workspace_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        logger.info("Collection '%s' created with indexes", self.collection)

    async def upsert_memory(
        self,
        entry_id: str,
        embedding: list[float],
        payload: dict,
    ):
        if not self.client:
            raise RuntimeError("Qdrant not initialized")
        self.client.upsert(
            collection_name=self.collection,
            points=[
                models.PointStruct(
                    id=entry_id,
                    vector=embedding,
                    payload=payload,
                )
            ],
        )

    async def search_memory(
        self,
        query_embedding: list[float],
        brand_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict]:
        if not self.client:
            raise RuntimeError("Qdrant not initialized")

        filter_conditions = []
        if brand_id:
            filter_conditions.append(
                models.FieldCondition(
                    key="brand_id",
                    match=models.MatchValue(value=brand_id),
                )
            )
        if workspace_id:
            filter_conditions.append(
                models.FieldCondition(
                    key="workspace_id",
                    match=models.MatchValue(value=workspace_id),
                )
            )

        search_filter = None
        if filter_conditions:
            search_filter = models.Filter(
                must=filter_conditions,
            )

        results = self.client.search(
            collection_name=self.collection,
            query_vector=query_embedding,
            query_filter=search_filter,
            limit=limit,
            with_payload=True,
        )

        return [
            {
                "id": str(r.id),
                "title": r.payload.get("title", ""),
                "content": r.payload.get("content", ""),
                "tags": r.payload.get("tags", []),
                "score": r.score,
            }
            for r in results
        ]

    async def delete_memory(self, entry_id: str):
        if not self.client:
            raise RuntimeError("Qdrant not initialized")
        self.client.delete(
            collection_name=self.collection,
            points_selector=models.PointIdsList(
                points=[entry_id],
            ),
        )

    async def close(self):
        if self.client:
            self.client.close()
            self.client = None


vector_store = VectorStore()
