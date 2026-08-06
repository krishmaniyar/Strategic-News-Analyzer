from sqlalchemy.orm import Session
from .. import crud, schemas
from ..utils import hash_utils
from .news_fetcher import NewsFetcher
from .deduplicator import Deduplicator
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Aggregator:
    def __init__(self, db: Session):
        self.db = db
        self.fetcher = NewsFetcher()
        self.deduplicator = Deduplicator(db)

    def run_ingestion(self):
        """
        Fetches news from all sources, deduplicates, and saves new articles.
        Returns stats on imported vs skipped.
        """
        logger.info("Starting news ingestion...")
        articles = self.fetcher.fetch_all()
        logger.info(f"Fetched {len(articles)} articles from sources.")

        stats = {"total_fetched": len(articles), "inserted": 0, "skipped": 0}

        for article_data in articles:
            try:
                # Generate Hash
                hash_id = hash_utils.generate_news_hash(article_data["title"], article_data["url"])
                
                # Check for duplicate
                if self.deduplicator.is_duplicate(article_data["title"], article_data["url"]):
                    stats["skipped"] += 1
                    continue

                # Prepare for DB
                news_create = schemas.NewsArticleCreate(
                    title=article_data["title"],
                    content=article_data.get("content"),
                    source=article_data["source"],
                    url=article_data["url"],
                    published_at=article_data.get("published_at"),
                    language=article_data.get("language"),
                    raw_json=article_data.get("raw_json"),
                    hash_id=hash_id
                )

                # Save
                crud.create_article(self.db, news_create)
                stats["inserted"] += 1
                
            except Exception as e:
                logger.error(f"Error processing article: {article_data.get('title', 'Unknown')}. Error: {e}")
        
        logger.info(f"Ingestion complete. Stats: {stats}")
        return stats
