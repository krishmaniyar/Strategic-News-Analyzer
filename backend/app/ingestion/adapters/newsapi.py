import httpx
from typing import AsyncIterator
from datetime import datetime
from app.ingestion.base import BaseSourceAdapter, RawArticle, fetch_with_retry
from app.core.logging import get_logger

logger = get_logger(__name__)

class NewsAPIAdapter(BaseSourceAdapter):
    BASE_URL = "https://newsapi.org/v2/everything"
    GEOPOLITICS_QUERY = (
        "geopolitics OR \"foreign policy\" OR sanctions OR diplomacy OR "
        "\"military conflict\" OR \"trade war\" OR NATO OR \"United Nations\""
    )

    def source_id(self) -> str:
        return "NewsAPI"

    async def fetch(self) -> AsyncIterator[RawArticle]:
        if not self.api_key:
            logger.warning("newsapi_key_missing", source=self.source_id())
            return

        params = {
            "q": self.GEOPOLITICS_QUERY,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 100,
            "apiKey": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await fetch_with_retry(client, "get", self.BASE_URL, params=params)
                data = resp.json()
        except Exception as e:
            logger.error("newsapi_fetch_failed", error=str(e))
            return

        articles = data.get("articles", [])
        logger.info("newsapi_fetched", count=len(articles))

        for item in articles:
            published_at = None
            if item.get("publishedAt"):
                try:
                    # Parse standard ISO timestamp, replace Z with UTC
                    iso_str = item["publishedAt"].replace("Z", "+00:00")
                    published_at = datetime.fromisoformat(iso_str)
                except ValueError:
                    pass

            article = RawArticle(
                title=item.get("title", ""),
                url=item.get("url", ""),
                source_name=item.get("source", {}).get("name", "NewsAPI"),
                content=item.get("content") or item.get("description"),
                published_at=published_at,
                language="en",
                author=item.get("author"),
                image_url=item.get("urlToImage")
            )

            if self._is_valid(article):
                yield article
