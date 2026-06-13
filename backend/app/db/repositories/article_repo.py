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
        """Resolve a source ID by its name from the sources table."""
        # Check standard sources (case-insensitive query)
        stmt = select(Source.id).where(Source.name.ilike(source_name))
        result = await self.db.execute(stmt)
        source_id = result.scalar_one_or_none()

        if source_id:
            return source_id

        # If source doesn't exist, create it dynamically
        try:
            new_source = Source(
                id=uuid.uuid4(),
                name=source_name,
                credibility_score=0.7,
                is_active=True
            )
            self.db.add(new_source)
            await self.db.flush()  # Obtain the generated ID without committing yet
            logger.info("source_created_dynamically", source_name=source_name, source_id=new_source.id)
            return new_source.id
        except Exception as e:
            logger.error("failed_to_create_source", source_name=source_name, error=str(e))
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
        processed_only: Optional[bool] = None
    ) -> List[Article]:
        """Fetch articles from database sorted by publication date descending."""
        stmt = select(Article).options(selectinload(Article.analysis))
        if processed_only is not None:
            stmt = stmt.where(Article.is_processed == processed_only)
        stmt = stmt.order_by(Article.published_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_unprocessed(self, limit: int = 50) -> List[Article]:
        """Fetch articles that are not yet marked as processed."""
        stmt = select(Article).where(not Article.is_processed).limit(limit)
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
