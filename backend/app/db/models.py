from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey, Text, Integer
from sqlalchemy.types import UserDefinedType
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    base_url = Column(String, nullable=True)
    country = Column(String, nullable=True)
    bias_rating = Column(String, nullable=True)
    credibility_score = Column(Float, default=0.7)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    articles = relationship("Article", back_populates="source")

class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    title = Column(String, nullable=False)
    content_raw = Column(Text, nullable=True)
    url = Column(String, nullable=False)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    language = Column(String, default="en")
    hash_id = Column(String, unique=True, nullable=False, index=True)
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    source = relationship("Source", back_populates="articles")
    analysis = relationship("ArticleAnalysis", back_populates="article", uselist=False, cascade="all, delete-orphan")

class ArticleAnalysis(Base):
    __tablename__ = "article_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), unique=True, nullable=False)
    sentiment_label = Column(String, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    bias_label = Column(String, nullable=True)
    bias_score = Column(Float, nullable=True)
    strategic_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    translated_title = Column(Text, nullable=True)
    translated_content = Column(Text, nullable=True)
    original_language = Column(String, nullable=True)
    key_drivers = Column(JSONB, default=list)
    affected_regions = Column(JSONB, default=list)
    analyzed_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    article = relationship("Article", back_populates="analysis")

class PGVector(UserDefinedType):
    """Custom SQLAlchemy type for pgvector support without external dependencies."""
    def get_col_spec(self, **kw):
        return "vector(768)"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            if isinstance(value, list):
                return "[" + ",".join(map(str, value)) + "]"
            return value
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            # asyncpg might return a string or list/numpy array depending on configuration
            if isinstance(value, str):
                return [float(x) for x in value.strip("[]").split(",") if x.strip()]
            return value
        return process

class ArticleEmbedding(Base):
    __tablename__ = "article_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(PGVector, nullable=False)
    model = Column(String, default="nomic-embed-text")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    article = relationship("Article", backref="embeddings")

class Entity(Base):
    __tablename__ = "entities"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    global_risk_score = Column(Float, default=0.0)
    mention_count = Column(Integer, default=1)
    first_seen = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_seen = Column(DateTime(timezone=True), default=datetime.utcnow)

class EntityRelation(Base):
    __tablename__ = "entity_relations"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    from_entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    to_entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False)
    confidence = Column(Float, default=0.5)
    evidence_count = Column(Integer, default=1)
    source_article_ids = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="ongoing")
    risk_level = Column(String, default="Low")
    involved_entity_ids = Column(JSONB, default=list)
    affected_regions = Column(JSONB, default=list)
    centroid = Column(PGVector, nullable=True)
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class EventArticle(Base):
    __tablename__ = "event_articles"

    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True)
    relevance_score = Column(Float, nullable=True)
    linked_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="SET NULL"), nullable=True)
    topic = Column(String, nullable=False)
    prediction = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    timeframe = Column(String, nullable=True)
    risk_level = Column(String, nullable=True)
    key_scenarios = Column(JSONB, default=list)
    key_risks = Column(JSONB, default=list)
    evidence_summary = Column(Text, nullable=True)
    chain_of_thought = Column(Text, nullable=True)
    outcome_occurred = Column(Boolean, nullable=True)
    brier_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class ForecastEvidence(Base):
    __tablename__ = "forecast_evidence"

    forecast_id = Column(UUID(as_uuid=True), ForeignKey("forecasts.id", ondelete="CASCADE"), primary_key=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True)
    relevance_note = Column(Text, nullable=True)
