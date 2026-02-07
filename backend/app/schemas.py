from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NewsArticleBase(BaseModel):
    title: str
    content: Optional[str] = None
    source: str
    url: str
    published_at: Optional[datetime] = None
    language: Optional[str] = None

class NewsArticleCreate(NewsArticleBase):
    raw_json: Optional[str] = None
    hash_id: str

class NewsArticle(NewsArticleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
