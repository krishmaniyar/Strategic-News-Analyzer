from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

from ..services.aggregator import Aggregator

router = APIRouter()

@router.post("/news/fetch")
def fetch_news(db: Session = Depends(database.get_db)):
    """
    Trigger fetching of new articles from external sources.
    """
    aggregator = Aggregator(db)
    stats = aggregator.run_ingestion()
    return {"message": "News fetching complete", "stats": stats}

@router.get("/news", response_model=List[schemas.NewsArticle])
def read_news(skip: int = 0, limit: int = 1000, db: Session = Depends(database.get_db)):
    """
    Get latest news articles.
    """
    articles = crud.get_articles(db, skip=skip, limit=limit)
    return articles





@router.get("/news/{article_id}", response_model=schemas.NewsArticle)
def read_news_article(article_id: int, db: Session = Depends(database.get_db)):
    """
    Get a specific news article by ID.
    """
    db_article = crud.get_article(db, article_id=article_id)
    if db_article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return db_article
