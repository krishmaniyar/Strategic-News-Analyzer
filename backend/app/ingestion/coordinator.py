from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.db.repositories.article_repo import ArticleRepository

# Import adapters
from app.ingestion.adapters.newsapi import NewsAPIAdapter
from app.ingestion.adapters.gnews import GNewsAdapter
from app.ingestion.adapters.mediastack import MediaStackAdapter
from app.ingestion.adapters.rss import RSSAdapter
from app.ingestion.adapters.gdelt import GDELTAdapter
from app.ingestion.deduplicator import compute_hash

logger = get_logger(__name__)

class IngestionCoordinator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ArticleRepository(db)
        
        # Instantiate adapters with config keys
        self.adapters = [
            NewsAPIAdapter(api_key=settings.newsapi_key),
            GNewsAdapter(api_key=settings.gnews_key),
            MediaStackAdapter(api_key=settings.mediastack_key),
            RSSAdapter(),
            GDELTAdapter()
        ]

    async def ingest_source(self, adapter) -> dict:
        """Fetch, deduplicate, and ingest articles from a single adapter."""
        source_id = adapter.source_id()
        logger.info("ingestion_start_source", source=source_id)
        
        stats = {
            "fetched": 0,
            "inserted": 0,
            "duplicates": 0,
            "errors": 0
        }
        
        try:
            async for raw_art in adapter.fetch():
                stats["fetched"] += 1
                
                # Compute exact duplicate hash ID
                hash_id = compute_hash(raw_art.title, raw_art.url)
                
                # Check DB for duplicate
                is_dup = await self.repo.exists_by_hash(hash_id)
                if is_dup:
                    stats["duplicates"] += 1
                    continue
                
                # Insert article
                article = await self.repo.create_article(
                    title=raw_art.title,
                    url=raw_art.url,
                    source_name=raw_art.source_name,
                    hash_id=hash_id,
                    content_raw=raw_art.content,
                    published_at=raw_art.published_at,
                    language=raw_art.language
                )
                
                if article:
                    stats["inserted"] += 1
                    # Trigger AI Core processing pipeline in-line
                    try:
                        from app.agents.analysis_agent import analyze_article
                        from app.agents.embedding_agent import embed_article
                        
                        logger.info("ai_pipeline_processing_start", article_id=article.id)
                        await analyze_article(article, self.repo)
                        await embed_article(article, self.repo)
                        logger.info("ai_pipeline_processing_success", article_id=article.id)
                    except Exception as ai_err:
                        logger.error("ai_pipeline_processing_failed", article_id=article.id, error=str(ai_err))
                else:
                    stats["errors"] += 1
                    
        except Exception as e:
            logger.error("ingestion_failed_source", source=source_id, error=str(e))
            stats["errors"] += 1
            
        logger.info("ingestion_complete_source", source=source_id, stats=stats)
        return stats

    async def run_pipeline(self) -> dict:
        """Run ingestion pipeline across all configured adapters."""
        logger.info("ingestion_pipeline_run_start")
        start_time = datetime.utcnow()
        
        overall_stats = {
            "sources": {},
            "total_fetched": 0,
            "total_inserted": 0,
            "total_duplicates": 0,
            "total_errors": 0,
            "duration_seconds": 0.0
        }
        
        for adapter in self.adapters:
            source_id = adapter.source_id()
            stats = await self.ingest_source(adapter)
            
            # Record individual source stats
            overall_stats["sources"][source_id] = stats
            
            # Aggregate stats
            overall_stats["total_fetched"] += stats["fetched"]
            overall_stats["total_inserted"] += stats["inserted"]
            overall_stats["total_duplicates"] += stats["duplicates"]
            overall_stats["total_errors"] += stats["errors"]
            
        # Commit all transactions
        try:
            await self.db.commit()
            logger.info("ingestion_pipeline_db_commit")
        except Exception as e:
            await self.db.rollback()
            logger.error("ingestion_pipeline_db_commit_failed", error=str(e))
            overall_stats["total_errors"] += len(self.adapters)
            
        duration = (datetime.utcnow() - start_time).total_seconds()
        overall_stats["duration_seconds"] = duration
        
        logger.info("ingestion_pipeline_run_complete", stats=overall_stats)
        return overall_stats
