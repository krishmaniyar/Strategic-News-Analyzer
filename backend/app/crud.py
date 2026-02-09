from sqlalchemy.orm import Session
from . import models, schemas

def get_article(db: Session, article_id: int):
    return db.query(models.NewsArticle).filter(models.NewsArticle.id == article_id).first()

def get_article_by_hash(db: Session, hash_id: str):
    return db.query(models.NewsArticle).filter(models.NewsArticle.hash_id == hash_id).first()

def get_articles(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.NewsArticle).order_by(models.NewsArticle.published_at.desc()).offset(skip).limit(limit).all()

def create_article(db: Session, article: schemas.NewsArticleCreate):
    db_article = models.NewsArticle(
        title=article.title,
        content=article.content,
        source=article.source,
        url=article.url,
        published_at=article.published_at,
        language=article.language,
        raw_json=article.raw_json,
        hash_id=article.hash_id
    )
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article
    