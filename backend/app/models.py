from sqlalchemy import Column, Integer, String, Text, DateTime, TIMESTAMP
from sqlalchemy.sql import func
from .database import Base

class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    source = Column(String, nullable=False)
    url = Column(String, unique=True, index=True, nullable=False)
    published_at = Column(DateTime, nullable=True)
    language = Column(String, nullable=True)
    raw_json = Column(Text, nullable=True)
    hash_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
