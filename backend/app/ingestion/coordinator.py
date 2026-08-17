import asyncio
from datetime import datetime
from typing import Optional
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
    def __init__(self, db: AsyncSession, main_loop: Optional[asyncio.AbstractEventLoop] = None):
        self.db = db
        self.repo = ArticleRepository(db)
        # main_loop is the FastAPI event loop — used for thread-safe WebSocket broadcasts.
        # The ingestion job runs in APScheduler's background thread with its own event loop.
        # Without this reference, broadcast_article() called from the background thread
        # would fail (different event loop). asyncio.run_coroutine_threadsafe() posts the
        # coroutine back to the correct loop.
        self.main_loop = main_loop

        # Instantiate adapters with config keys
        self.adapters = [
            NewsAPIAdapter(api_key=settings.newsapi_key),
            GNewsAdapter(api_key=settings.gnews_key),
            MediaStackAdapter(api_key=settings.mediastack_key),
            RSSAdapter(),
            GDELTAdapter()
        ]

    async def ingest_source(self, adapter, embed_enabled: bool = True) -> dict:
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
                    try:
                        from app.agents.analysis_agent import analyze_article
                        from app.agents.embedding_agent import embed_article
                        from app.agents.entity_agent import extract_entities
                        from app.db.repositories.entity_repo import upsert_entity, upsert_relation

                        logger.info("ai_pipeline_processing_start", article_id=article.id)
                        analysis_res = await analyze_article(article, self.repo)

                        # Only embed if Ollama is healthy (checked once before the run starts)
                        if embed_enabled:
                            await embed_article(article, self.repo)

                        # Entity extraction and knowledge graph upsert
                        entity_result = await extract_entities(str(article.id), article.content_raw)
                        if entity_result and entity_result.get("entities"):
                            entity_id_map = {}
                            for ent in entity_result["entities"]:
                                ent_id = await upsert_entity(self.db, ent["name"], ent["type"], ent.get("description"))
                                entity_id_map[ent["name"]] = ent_id

                            for rel in entity_result.get("relations", []):
                                from_name = rel.get("from")
                                to_name = rel.get("to")
                                if from_name in entity_id_map and to_name in entity_id_map:
                                    await upsert_relation(
                                        self.db,
                                        entity_id_map[from_name],
                                        entity_id_map[to_name],
                                        rel.get("relation"),
                                        rel.get("confidence", 0.5),
                                        str(article.id)
                                    )

                        # Broadcast via WebSocket — must post to the main FastAPI event loop,
                        # NOT await here (we're in the background ingestion thread's event loop).
                        try:
                            from app.api.feed import manager
                            article_data = {
                                "id": str(article.id),
                                "title": article.title,
                                "url": article.url,
                                "source_name": raw_art.source_name,
                                "published_at": str(article.published_at),
                                "risk_level": (analysis_res or {}).get("risk_level", "Medium")
                            }
                            if self.main_loop and not self.main_loop.is_closed():
                                # Thread-safe: submit coroutine to the main event loop from this thread
                                asyncio.run_coroutine_threadsafe(
                                    manager.broadcast_article(article_data),
                                    self.main_loop
                                )
                        except Exception as ws_err:
                            logger.error("ws_broadcast_failed", error=str(ws_err))

                        logger.info("ai_pipeline_processing_success", article_id=article.id)
                    except Exception as ai_err:
                        logger.error("ai_pipeline_processing_failed", article_id=article.id, error=str(ai_err))

                    # Commit this article and its analysis/embeddings/entities immediately
                    try:
                        await self.db.commit()
                    except Exception as commit_err:
                        await self.db.rollback()
                        logger.error("article_commit_failed", article_id=article.id, error=str(commit_err))
                else:
                    stats["errors"] += 1

        except Exception as e:
            logger.error("ingestion_failed_source", source=source_id, error=str(e))
            stats["errors"] += 1

        logger.info("ingestion_complete_source", source=source_id, stats=stats)
        return stats

    async def run_pipeline(self) -> dict:
        """Run ingestion pipeline across all configured adapters."""
        from app.ai.ollama_client import ollama_client

        logger.info("ingestion_pipeline_run_start")
        start_time = datetime.utcnow()

        # Check Ollama availability once before processing any articles.
        # If Ollama is down, we skip embeddings for the entire run but continue
        # with analysis, entity extraction, etc. — ingestion is not blocked.
        embed_enabled = await ollama_client.health_check()
        if not embed_enabled:
            logger.warning("ollama_unavailable_skipping_embeddings",
                           reason="Ollama health check failed — embeddings will be skipped for this run")

        overall_stats = {
            "sources": {},
            "total_fetched": 0,
            "total_inserted": 0,
            "total_duplicates": 0,
            "total_errors": 0,
            "duration_seconds": 0.0,
            "embeddings_enabled": embed_enabled
        }

        for adapter in self.adapters:
            source_id = adapter.source_id()
            stats = await self.ingest_source(adapter, embed_enabled=embed_enabled)

            overall_stats["sources"][source_id] = stats
            overall_stats["total_fetched"] += stats["fetched"]
            overall_stats["total_inserted"] += stats["inserted"]
            overall_stats["total_duplicates"] += stats["duplicates"]
            overall_stats["total_errors"] += stats["errors"]

        # Final commit
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
