import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Article, Source, ArticleAnalysis, ArticleEmbedding
from app.core.logging import get_logger

logger = get_logger(__name__)

class ArticleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def exists_by_hash(self, hash_id: str) -> bool:
        """Check if an article with the exact SHA-256 hash already exists."""
        stmt = select(Article.id).where(Article.hash_id == hash_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_source_id_by_name(self, source_name: str) -> Optional[uuid.UUID]:
        """Resolve or atomically create a source by name.
        Uses INSERT ... ON CONFLICT to avoid TOCTOU race conditions under concurrent ingestion.
        """
        from sqlalchemy import text
        # Atomically insert or ignore; then fetch the canonical ID.
        new_id = str(uuid.uuid4())
        try:
            await self.db.execute(
                text("""
                    INSERT INTO sources (id, name, credibility_score, is_active)
                    VALUES (:id, :name, 0.7, true)
                    ON CONFLICT (name) DO NOTHING
                """),
                {"id": new_id, "name": source_name}
            )
            await self.db.flush()
        except Exception as e:
            logger.error("failed_to_upsert_source", source_name=source_name, error=str(e))

        # Always fetch the authoritative ID (works whether INSERT ran or was skipped)
        result = await self.db.execute(
            text("SELECT id FROM sources WHERE name = :name"),
            {"name": source_name}
        )
        row = result.fetchone()
        if row:
            logger.debug("source_resolved", source_name=source_name, source_id=row[0])
            return row[0]
        return None

    async def create_article(
        self,
        title: str,
        url: str,
        source_name: str,
        hash_id: str,
        content_raw: Optional[str] = None,
        published_at: Optional[datetime] = None,
        language: str = "en"
    ) -> Optional[Article]:
        """Insert a raw article into the database."""
        source_id = await self.get_source_id_by_name(source_name)

        try:
            # Re-verify hash existence before inserting to prevent race conditions
            if await self.exists_by_hash(hash_id):
                logger.debug("article_skipped_exact_duplicate", hash_id=hash_id)
                return None

            new_article = Article(
                id=uuid.uuid4(),
                title=title,
                url=url,
                content_raw=content_raw,
                source_id=source_id,
                published_at=published_at or datetime.utcnow(),
                language=language,
                hash_id=hash_id,
                is_processed=False
            )
            self.db.add(new_article)
            await self.db.flush()
            logger.debug("article_inserted", id=new_article.id, title=title[:50])
            return new_article
        except Exception as e:
            logger.error("failed_to_create_article", title=title[:50], error=str(e))
            return None

    async def get_articles(
        self,
        limit: int = 50,
        offset: int = 0,
        processed_only: Optional[bool] = None,
        search: Optional[str] = None
    ) -> List[Article]:
        """Fetch articles from database sorted by publication date descending."""
        from sqlalchemy import or_, exists as sa_exists
        stmt = select(Article).options(selectinload(Article.analysis))
        if processed_only is not None:
            stmt = stmt.where(Article.is_processed == processed_only)

        if search:
            search_pattern = f"%{search}%"
            # Use EXISTS subquery to avoid joining the same table that selectinload
            # already joins, which would produce duplicate Article rows.
            analysis_match = sa_exists().where(
                ArticleAnalysis.article_id == Article.id,
                ArticleAnalysis.summary.ilike(search_pattern)
            )
            stmt = stmt.where(
                or_(
                    Article.title.ilike(search_pattern),
                    analysis_match
                )
            )

        stmt = stmt.order_by(Article.published_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        # .unique() deduplicates ORM objects that may appear multiple times
        # when selectinload performs its secondary SELECT.
        return list(result.scalars().unique().all())

    async def get_unprocessed(self, limit: int = 50) -> List[Article]:
        """Fetch articles that are not yet marked as processed."""
        # FIX C2: `not Article.is_processed` is a Python boolean (always False).
        # Must use SQLAlchemy column comparison.
        stmt = select(Article).where(Article.is_processed == False).limit(limit)  # noqa: E712
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def save_analysis(self, article_id: uuid.UUID, analysis_data: dict) -> ArticleAnalysis:
        """Save article analysis profile and update article processed status."""
        stmt = select(ArticleAnalysis).where(ArticleAnalysis.article_id == article_id)
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            for key, val in analysis_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, val)
            analysis = existing
        else:
            analysis = ArticleAnalysis(
                id=uuid.uuid4(),
                article_id=article_id,
                **analysis_data
            )
            self.db.add(analysis)

        # Mark article as processed
        stmt_article = select(Article).where(Article.id == article_id)
        article_result = await self.db.execute(stmt_article)
        article = article_result.scalar_one_or_none()
        if article:
            article.is_processed = True

        await self.db.flush()
        logger.info("analysis_saved", article_id=article_id, analysis_id=analysis.id)
        return analysis

    async def save_embeddings(self, article_id: uuid.UUID, chunks: List[str], embeddings: List[List[float]]) -> None:
        """Save generated text chunks and their embeddings, removing old ones first."""
        from sqlalchemy import delete
        stmt = delete(ArticleEmbedding).where(ArticleEmbedding.article_id == article_id)
        await self.db.execute(stmt)

        for idx, (chunk_text, emb) in enumerate(zip(chunks, embeddings)):
            emb_obj = ArticleEmbedding(
                id=uuid.uuid4(),
                article_id=article_id,
                chunk_text=chunk_text,
                chunk_index=idx,
                embedding=emb,
                model="nomic-embed-text"
            )
            self.db.add(emb_obj)

        await self.db.flush()
        logger.info("embeddings_saved", article_id=article_id, count=len(chunks))
