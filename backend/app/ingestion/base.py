from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncIterator, Optional

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
