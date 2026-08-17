import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncIterator, Optional
import structlog

_logger = structlog.get_logger(__name__)


async def fetch_with_retry(client, method: str, url: str, *, max_retries: int = 3, **kwargs):
    """Shared HTTP fetch with exponential backoff retry.
    Critical for once-daily ingestion: a transient failure on any adapter
    without retry means zero articles from that source all day.

    Args:
        client: an httpx.AsyncClient instance
        method: HTTP method string ("get" or "post")
        url: target URL
        max_retries: total attempts (default 3 → waits 1s, 2s before 3rd try)
        **kwargs: passed through to the httpx client method (params, json, headers, etc.)
    Returns:
        httpx.Response with raise_for_status() already called
    Raises:
        Exception on final attempt failure
    """
    last_exc = None
    for attempt in range(max_retries):
        try:
            resp = await getattr(client, method)(url, **kwargs)
            resp.raise_for_status()
            return resp
        except Exception as e:
            last_exc = e
            if attempt < max_retries - 1:
                wait = 2 ** attempt  # 1s, 2s before 3rd attempt
                _logger.warning("fetch_retry", url=url, attempt=attempt + 1, wait_seconds=wait, error=str(e))
                await asyncio.sleep(wait)
    raise last_exc

@dataclass
class RawArticle:
    title: str
    url: str
    source_name: str
    content: Optional[str] = None
    published_at: Optional[datetime] = None
    language: str = "en"
    author: Optional[str] = None
    image_url: Optional[str] = None

class BaseSourceAdapter(ABC):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    @abstractmethod
    async def fetch(self) -> AsyncIterator[RawArticle]:
        """Yield articles. Must handle rate limiting, network errors, and empty results."""
        pass

    @abstractmethod
    def source_id(self) -> str:
        """Unique identifier matching the name in the sources table."""
        pass

    def _is_valid(self, article: RawArticle) -> bool:
        """Basic quality check for incoming raw articles."""
        if not article.title or len(article.title.strip()) < 10:
            return False
        if not article.url or not (article.url.startswith("http://") or article.url.startswith("https://")):
            return False
        if article.title == article.title.upper():  # Clickbait / junk filter
            return False
        return True
