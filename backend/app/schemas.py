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
    
    
    # AI Fields
    translated_title: Optional[str] = None
    translated_text: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    bias_label: Optional[str] = None
    bias_score: Optional[float] = None
    strategic_score: Optional[float] = None
    risk_level: Optional[str] = None
    key_factors: Optional[str] = None # JSON string or comma-separated
    summary_reason: Optional[str] = None
    ai_processed: bool = False

    class Config:
        from_attributes = True
