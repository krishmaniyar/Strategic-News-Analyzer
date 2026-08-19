from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.db.repositories.article_repo import ArticleRepository

router = APIRouter()

@router.get("/")
async def list_articles(
    limit: int = Query(100, ge=1),
    offset: int = Query(0, ge=0),
    processed_only: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve ingested news articles sorted by publication date descending."""
    repo = ArticleRepository(db)
    articles_list = await repo.get_articles(limit=limit, offset=offset, processed_only=processed_only, search=search)

    # Format database models as simple JSON dicts
    results = []
    for art in articles_list:
        analysis_data = None
        if art.analysis:
            analysis_data = {
                "sentiment_label": art.analysis.sentiment_label,
                "sentiment_score": art.analysis.sentiment_score,
                "bias_label": art.analysis.bias_label,
                "bias_score": art.analysis.bias_score,
                "strategic_score": art.analysis.strategic_score,
                "risk_level": art.analysis.risk_level,
                "summary": art.analysis.summary,
                "translated_title": art.analysis.translated_title,
                "translated_content": art.analysis.translated_content,
                "original_language": art.analysis.original_language,
                "key_drivers": art.analysis.key_drivers,
                "affected_regions": art.analysis.affected_regions,
            }

        results.append({
            "id": str(art.id),
            "title": art.title,
            "url": art.url,
            "published_at": art.published_at.isoformat() if art.published_at else None,
            "language": art.language,
            "hash_id": art.hash_id,
            "is_processed": art.is_processed,
            "source_id": str(art.source_id) if art.source_id else None,
            "analysis": analysis_data
        })

    return {
        "count": len(results),
        "limit": limit,
        "offset": offset,
        "articles": results
    }
