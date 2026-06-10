import httpx
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import AsyncIterator
from app.ingestion.base import BaseSourceAdapter, RawArticle
from app.core.logging import get_logger

logger = get_logger(__name__)

class RSSAdapter(BaseSourceAdapter):
    # Mapping of source names to their RSS feed URLs
    FEEDS = {
        "BBC RSS": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "Al Jazeera RSS": "https://www.aljazeera.com/xml/rss/all.xml",
        "Reuters RSS": "https://www.reuters.com/arc/outboundfeeds/news-template-feed-by-section/?section=world&size=30"
    }

    def __init__(self, api_key: str = None):
        super().__init__(api_key)

    def source_id(self) -> str:
        return "RSS"

    async def fetch(self) -> AsyncIterator[RawArticle]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for source_name, url in self.FEEDS.items():
                logger.info("rss_fetching_feed", source=source_name, url=url)
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    xml_content = resp.content
                except Exception as e:
                    logger.error("rss_fetch_failed", source=source_name, error=str(e))
                    continue

                try:
                    root = ET.fromstring(xml_content)
                    channel = root.find("channel")
                    if channel is None:
                        logger.warning("rss_invalid_format", source=source_name)
                        continue

                    items = channel.findall("item")[:10]
                    logger.info("rss_fetched_items", source=source_name, count=len(items))

                    for item in items:
                        title_el = item.find("title")
                        link_el = item.find("link")
                        desc_el = item.find("description")
                        pub_date_el = item.find("pubDate")

                        title = title_el.text if title_el is not None else ""
                        link = link_el.text if link_el is not None else ""
                        description = desc_el.text if desc_el is not None else ""

                        published_at = None
                        if pub_date_el is not None and pub_date_el.text:
                            try:
                                # email.utils parses RFC 2822 formatting standard for RSS
                                published_at = parsedate_to_datetime(pub_date_el.text)
                            except Exception:
                                pass

                        article = RawArticle(
                            title=title.strip(),
                            url=link.strip(),
                            source_name=source_name,
                            content=description.strip() if description else None,
                            published_at=published_at,
                            language="en"
                        )

                        if self._is_valid(article):
                            yield article
                except Exception as e:
                    logger.error("rss_parse_error", source=source_name, error=str(e))
