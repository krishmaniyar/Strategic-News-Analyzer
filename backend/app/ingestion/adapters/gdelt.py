import httpx
from typing import AsyncIterator
from datetime import datetime
from app.ingestion.base import BaseSourceAdapter, RawArticle, fetch_with_retry
from app.core.logging import get_logger

logger = get_logger(__name__)

class GDELTAdapter(BaseSourceAdapter):
    # Query GDELT DOC API v2 for recent articles matching geopolitical keywords
    BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
    QUERY = "geopolitics OR diplomacy OR conflict OR sanctions"

    def source_id(self) -> str:
        return "GDELT"

    async def fetch(self) -> AsyncIterator[RawArticle]:
        params = {
            "query": self.QUERY,
            "mode": "artlist",
            "format": "json",
            "maxrecords": 250,
            "timespan": "72h" # Fetch articles from the last 72 hours
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await fetch_with_retry(client, "get", self.BASE_URL, params=params)
                data = resp.json()
        except Exception as e:
            logger.error("gdelt_fetch_failed", error=str(e))
            return

        articles = data.get("articles", [])
        logger.info("gdelt_fetched", count=len(articles))

        for item in articles:
            published_at = None
            # GDELT date format: YYYYMMDDTHHMMSSZ (e.g. 20241024T120000Z)
            seendate = item.get("seendate")
            if seendate:
                try:
                    iso_str = f"{seendate[0:4]}-{seendate[4:6]}-{seendate[6:8]}T{seendate[9:11]}:{seendate[11:13]}:{seendate[13:15]}Z"
                    published_at = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
                except (ValueError, IndexError):
                    pass

            article = RawArticle(
                title=item.get("title", ""),
                url=item.get("url", ""),
                source_name="GDELT",
                content=None, # GDELT DOC API returns article lists without full body content
                published_at=published_at,
                language="en"
            )

            if self._is_valid(article):
                yield article
