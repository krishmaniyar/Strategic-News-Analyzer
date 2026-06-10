import uuid
import asyncio
from app.core.logging import get_logger
from app.ai.ollama_client import ollama_client
from app.db.repositories.article_repo import ArticleRepository
from app.db.models import Article

logger = get_logger(__name__)

def chunk_text(text: str, max_chars: int = 2048, overlap: int = 256) -> list[str]:
    """Split text recursively into character windows (approx 512 tokens) with overlap (approx 64 tokens)."""
    if not text or not text.strip():
        return []
        
    if len(text) <= max_chars:
        return [text.strip()]
        
    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        if end >= len(text):
            chunks.append(text[start:])
            break
            
        # Try to find a logical boundary
        split_pos = -1
        for sep in ["\n\n", "\n", ". ", " "]:
            pos = text.rfind(sep, start + overlap, end)
            if pos != -1:
                split_pos = pos + len(sep)
                break
                
        if split_pos == -1:
            split_pos = end
            
        chunks.append(text[start:split_pos])
        start = split_pos - overlap
        if start >= split_pos:
            start = split_pos
            
    return [c.strip() for c in chunks if c.strip()]

async def embed_article(article: Article, repo: ArticleRepository) -> list[list[float]]:
    """Chunk the article, fetch embeddings for chunks from Ollama, and save to DB."""
    content = article.content_raw or article.title or ""
    
    # If the article has a translation, we should embed the translated content
    # We can check article.analysis for translated_content
    # (Note: we check both ORM relationship and database if needed)
    if article.analysis and article.analysis.translated_content:
        content = article.analysis.translated_content
        logger.info("embedding_using_translated_content", article_id=article.id)
    
    chunks = chunk_text(content)
    if not chunks:
        logger.warning("no_chunks_to_embed", article_id=article.id)
        return []
        
    embeddings = await ollama_client.embed_batch(chunks)
    await repo.save_embeddings(article.id, chunks, embeddings)
    return embeddings

# Celery wrapper
from app.core.celery_app import celery_app
from app.core.database import SessionLocal

@celery_app.task(name="agents.embed_article")
def embed_article_task(article_id: str):
    import asyncio
    async def _run():
        from app.db.repositories.article_repo import ArticleRepository
        from app.db.models import Article
        from sqlalchemy import select
        
        async with SessionLocal() as db:
            repo = ArticleRepository(db)
            stmt = select(Article).where(Article.id == article_id)
            res = await db.execute(stmt)
            article = res.scalar_one_or_none()
            if article:
                await embed_article(article, repo)
                await db.commit()
    asyncio.run(_run())
