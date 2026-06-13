import httpx
from typing import AsyncIterator
from datetime import datetime
from app.ingestion.base import BaseSourceAdapter, RawArticle
from app.core.logging import get_logger

logger = get_logger(__name__)

class GNewsAdapter(BaseSourceAdapter):
    BASE_URL = "https://gnews.io/api/v4/search"
    GEOPOLITICS_QUERY = "geopolitics OR diplomacy OR \"foreign policy\" OR conflict"

    def source_id(self) -> str:
        return "GNews"

    async def fetch(self) -> AsyncIterator[RawArticle]:
        if not self.api_key:
            logger.warning("gnews_key_missing", source=self.source_id())
            return

        params = {
            "q": self.GEOPOLITICS_QUERY,
            "lang": "en",
            "max": 100,
            "apikey": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.BASE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error("gnews_fetch_failed", error=str(e))
            return

        articles = data.get("articles", [])
        logger.info("gnews_fetched", count=len(articles))

        for item in articles:
            published_at = None
            if item.get("publishedAt"):
                try:
                    iso_str = item["publishedAt"].replace("Z", "+00:00")
                    published_at = datetime.fromisoformat(iso_str)
                except ValueError:
                    pass

            article = RawArticle(
                title=item.get("title", ""),
                url=item.get("url", ""),
                source_name=item.get("source", {}).get("name", "GNews"),
                content=item.get("content") or item.get("description"),
                published_at=published_at,
                language="en",
                image_url=item.get("image")
            )

            if self._is_valid(article):
                yield article
