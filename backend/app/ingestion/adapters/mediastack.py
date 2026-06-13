import httpx
from typing import AsyncIterator
from datetime import datetime
from app.ingestion.base import BaseSourceAdapter, RawArticle
from app.core.logging import get_logger

logger = get_logger(__name__)

class MediaStackAdapter(BaseSourceAdapter):
    BASE_URL = "http://api.mediastack.com/v1/news"

    def source_id(self) -> str:
        return "MediaStack"

    async def fetch(self) -> AsyncIterator[RawArticle]:
        if not self.api_key:
            logger.warning("mediastack_key_missing", source=self.source_id())
            return

        params = {
            "access_key": self.api_key,
            "keywords": "diplomacy",
            "languages": "en",
            "limit": 100
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.BASE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error("mediastack_fetch_failed", error=str(e))
            return

        articles = data.get("data", [])
        logger.info("mediastack_fetched", count=len(articles))

        for item in articles:
            published_at = None
            if item.get("published_at"):
                try:
                    iso_str = item["published_at"].replace("Z", "+00:00")
                    published_at = datetime.fromisoformat(iso_str)
                except ValueError:
                    pass

            article = RawArticle(
                title=item.get("title", ""),
                url=item.get("url", ""),
                source_name=item.get("source") or "MediaStack",
                content=item.get("description"),
                published_at=published_at,
                language=item.get("language", "en"),
                author=item.get("author"),
                image_url=item.get("image")
            )

            if self._is_valid(article):
                yield article
