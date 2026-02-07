from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter()

@router.get("/news", response_model=List[schemas.NewsArticle])
def read_news(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
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
