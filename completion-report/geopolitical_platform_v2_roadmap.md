# Geopolitical Intelligence Platform — V2 Implementation Roadmap

> **Role**: Senior Software Architect + Tech Lead + AI Engineer + QA + PM  
> **Process**: Iterative, phase-gated. No phase begins until the previous one is verified.  
> **Target audience**: Recruiters, hiring managers at SWE/ML/AI Engineer roles.  
> **Estimated timeline**: 13 weeks

---

## Table of Contents

1. [V1 → V2 Delta Analysis](#1-v1--v2-delta-analysis)
2. [Repository & Branch Strategy](#2-repository--branch-strategy)
3. [Phase 0 — Pre-Development Setup](#3-phase-0--pre-development-setup)
4. [Phase 1 — Foundation](#4-phase-1--foundation)
5. [Phase 2 — AI Core](#5-phase-2--ai-core)
6. [Phase 3 — Advanced AI](#6-phase-3--advanced-ai)
7. [Phase 4 — Frontend Dashboard](#7-phase-4--frontend-dashboard)
8. [Phase 5 — Production & Polish](#8-phase-5--production--polish)
9. [Cross-Phase Architecture Decisions](#9-cross-phase-architecture-decisions)
10. [Evaluation Metrics Tracker](#10-evaluation-metrics-tracker)
11. [Interview Prep — Talking Points Per Phase](#11-interview-prep--talking-points-per-phase)

---

## 1. V1 → V2 Delta Analysis

### 1.1 What Carries Forward (Port, Don't Rewrite)

| V1 Component | V2 Action | Notes |
|---|---|---|
| FastAPI async pattern | **Keep + extend** | Add Supabase auth middleware, versioned routers |
| Multi-source adapter pattern | **Keep + generalize** | Move to `BaseSourceAdapter` ABC; add GDELT + RSS |
| SHA-256 hash deduplication | **Keep + strengthen** | Move hash constraint to DB level; add near-dedup via pgvector |
| Parallel sentiment + bias inference | **Keep + generalize** | Replace `asyncio.gather` pattern now used across all agents |
| Structured logging with timing | **Extend into Prometheus** | Replace custom `PerformanceMonitor` with prometheus-client |
| Pydantic settings via `.env` | **Keep** | Add 15+ new env vars for new services |

### 1.2 What Gets Replaced (Do NOT Port)

| V1 Component | Reason | V2 Replacement |
|---|---|---|
| SQLite | No concurrency, no vectors, not cloud-native | Supabase PostgreSQL + pgvector |
| `BackgroundTasks` (uvicorn-thread) | Shares event loop; no retry; no scaling | Celery + Redis Streams |
| Google Translate (`deep-translator`) | Rate-limited, privacy risk, external dep | Groq `llama-3.1-8b-instant` with translation prompt |
| RoBERTa local models (125M params) | 4.8s cold start; CPU-bound; no generative capability | Groq API (< 1s, generative, no load time) |
| Hardcoded strategic score formula | Not intelligent; gameable; zero explainability | LLM-based scorer with reasoning via Groq |
| Sequential per-article pipeline | 2s/article = 2000s for 1000 articles | Parallel Celery workers |
| No auth | Not deployable, no multi-user | Supabase Auth + JWT + RLS |

### 1.3 What's Entirely New

- Redis Streams + Celery task queue with retry/DLQ
- `nomic-embed-text` embedding pipeline → pgvector HNSW index
- Entity extraction agent (Ollama `qwen2.5:3b`)
- HDBSCAN event clustering with automatic event title generation
- Knowledge graph (entities + relations in PostgreSQL)
- RAG system: hybrid retrieval (vector + FTS + RRF) + Groq generation
- Geopolitical forecasting engine with Brier score tracking
- Next.js 14 frontend: D3 world risk map, live WebSocket feed, entity force graph, AI analyst chat
- Prometheus + Grafana observability
- Supabase Realtime for push updates
- Railway + Vercel production deployment with GitHub Actions CI/CD

---

## 2. Repository & Branch Strategy

### 2.1 Repo Structure Decision

Two valid options — pick one before starting:

**Option A: New folder in existing repo** (recommended for continuity)
```
geopolitical-news-dashboard/
├── v1/                          # Rename existing root to v1/
│   ├── backend/
│   └── README.md
├── v2/                          # All new work here
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml
│   └── README.md
└── README.md                    # Top-level: links to v1 and v2
```

**Option B: Fresh branch** (cleaner for portfolio)
```bash
git checkout -b v2-rebuild
# Start from scratch in root
```

**Recommendation**: Option A. Recruiters see the evolution from V1 → V2, which is a stronger story than a single codebase.

### 2.2 Branch Convention

```
main              ← Production-ready only
v2/dev            ← Active development integration branch
v2/phase-1        ← Phase 1 work
v2/phase-2        ← Phase 2 work
...
v2/feature/<name> ← Feature branches off dev
```

### 2.3 Commit Message Convention (Carry over from V1)

```
<type>(<scope>): <description>

Types: feat | fix | refactor | test | docs | chore | perf
Scope: ingestion | ai | rag | kg | celery | frontend | infra | db

Examples:
feat(rag): add hybrid retrieval with RRF scoring
feat(agents): implement HDBSCAN event clustering agent
perf(embeddings): batch embed 50 articles per Ollama call instead of 1
fix(celery): handle partial failures in asyncio.gather gracefully
```

---

## 3. Phase 0 — Pre-Development Setup

**Duration**: 0.5 week  
**Goal**: All tooling configured, accounts created, local environment verified before writing a single line of application code.

### 3.1 Tasks

#### Accounts & Services (Free Tier — All Cost $0)
- [ ] **Supabase**: Create project at supabase.com → get `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DATABASE_URL`
- [ ] **Groq**: Create account at console.groq.com → get `GROQ_API_KEY`
- [ ] **Vercel**: Create account (for frontend deployment in Phase 5)
- [ ] **Railway**: Create account (for backend deployment in Phase 5)
- [ ] **NewsAPI**: Get free key (100 req/day) at newsapi.org
- [ ] **GNews**: Get free key at gnews.io

#### Local Tooling
```bash
# Required versions
python --version    # 3.11+
docker --version    # 24+
docker compose version  # v2+ (note: no hyphen)
node --version      # 20+
npm --version       # 10+

# Install Ollama (for local model inference)
# Linux/Mac:
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required models (do this now — slow first run)
ollama pull nomic-embed-text    # 274MB — embeddings
ollama pull qwen2.5:3b           # 1.9GB — entity extraction
ollama pull llama3.2:3b          # 2.0GB — KG extraction

# Verify Ollama
ollama list
curl http://localhost:11434/api/tags
```

#### Python Environment
```bash
# Create env for V2 (separate from V1 to avoid conflicts)
conda create -n geo_v2 python=3.11 -y
conda activate geo_v2
pip install httpie          # For manual API testing
pip install ruff mypy pytest  # Dev tools (global)
```

### 3.2 Validation Criteria for Phase 0

Before proceeding, verify ALL of the following:

```bash
# 1. Supabase connection
python -c "
import asyncpg, asyncio
async def test():
    conn = await asyncpg.connect('YOUR_DATABASE_URL')
    print('Supabase connected:', await conn.fetchval('SELECT version()'))
asyncio.run(test())
"

# 2. Groq API
python -c "
from groq import Groq
client = Groq(api_key='YOUR_KEY')
resp = client.chat.completions.create(
    model='llama-3.1-8b-instant',
    messages=[{'role':'user','content':'Say: GROQ_OK'}]
)
print(resp.choices[0].message.content)
"

# 3. Ollama embeddings
curl -X POST http://localhost:11434/api/embeddings \
  -H 'Content-Type: application/json' \
  -d '{"model": "nomic-embed-text", "prompt": "test article"}'
# Should return: {"embedding": [0.123, ...]} with 768 floats

# 4. Docker Compose
docker compose version   # Must say v2+
docker run hello-world   # Docker daemon running
```

**Phase 0 Definition of Done**: All 4 verification commands pass. No proceeding without this.

---

## 4. Phase 1 — Foundation

**Duration**: 2 weeks  
**Goal**: Articles from 5+ sources are being fetched, deduplicated, and stored in Supabase. Auth works. No AI yet.  
**Branch**: `v2/phase-1`

### 4.1 Week 1: Infrastructure + Database

#### Task 1.1: Monorepo Structure
Create the project scaffold. Every directory gets created now — even if empty — so the architecture is visible from day one.

```
v2/
├── .github/
│   └── workflows/
│       └── ci.yml              # Created in Phase 5 — placeholder only now
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── agents/             # Empty — Phase 2
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── groq_client.py  # Empty — Phase 2
│   │   │   ├── ollama_client.py # Empty — Phase 2
│   │   │   └── model_router.py  # Empty — Phase 2
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── articles.py
│   │   │   ├── admin.py
│   │   │   └── auth.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   └── repositories/
│   │   │       └── article_repo.py
│   │   └── ingestion/
│   │       ├── base.py
│   │       ├── coordinator.py
│   │       ├── deduplicator.py
│   │       └── adapters/
│   │           ├── newsapi.py
│   │           ├── gnews.py
│   │           ├── mediastack.py
│   │           ├── rss.py
│   │           └── gdelt.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── unit/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/                    # Empty — Phase 4
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

#### Task 1.2: Database Schema (Supabase)
Run these SQL migrations in Supabase SQL Editor. **Order matters** — foreign keys require parent tables first.

```sql
-- Migration 001: Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- Migration 002: Sources table
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    base_url TEXT,
    country TEXT,
    bias_rating TEXT,
    credibility_score FLOAT4 DEFAULT 0.7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 003: Articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_raw TEXT,
    url TEXT NOT NULL,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    language TEXT DEFAULT 'en',
    hash_id TEXT NOT NULL,
    is_processed BOOLEAN DEFAULT FALSE,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_raw, ''))
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON articles (hash_id);
CREATE INDEX ON articles (published_at DESC);
CREATE INDEX ON articles (source_id);
CREATE INDEX ON articles (is_processed);
CREATE INDEX ON articles USING GIN (search_vector);

-- Migration 004: Article analysis (separate table — articles are the source of truth)
CREATE TABLE article_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE UNIQUE,
    sentiment_label TEXT,
    sentiment_score FLOAT4,
    bias_label TEXT,
    bias_score FLOAT4,
    strategic_score FLOAT4,
    risk_level TEXT,
    summary TEXT,
    translated_title TEXT,
    translated_content TEXT,
    original_language TEXT,
    key_drivers JSONB DEFAULT '[]',
    affected_regions JSONB DEFAULT '[]',
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON article_analysis (article_id);
CREATE INDEX ON article_analysis (strategic_score DESC NULLS LAST);
CREATE INDEX ON article_analysis (risk_level);

-- Migration 005: Embeddings (pgvector)
CREATE TABLE article_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(768) NOT NULL,
    model TEXT DEFAULT 'nomic-embed-text',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (article_id, chunk_index)
);
CREATE INDEX ON article_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- Migration 006: Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ongoing',
    risk_level TEXT DEFAULT 'Low',
    involved_entity_ids JSONB DEFAULT '[]',
    affected_regions JSONB DEFAULT '[]',
    centroid vector(768),               -- Average embedding of constituent articles
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON events (risk_level);
CREATE INDEX ON events (last_updated DESC);

CREATE TABLE event_articles (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    relevance_score FLOAT4,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, article_id)
);
CREATE INDEX ON event_articles (event_id);
CREATE INDEX ON event_articles (article_id);

-- Migration 007: Knowledge Graph
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,                 -- Person|Country|Organization|Treaty|Concept
    description TEXT,
    global_risk_score FLOAT4 DEFAULT 0.0,
    mention_count INTEGER DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, type)
);
CREATE INDEX ON entities (mention_count DESC);
CREATE INDEX ON entities (type);

CREATE TABLE entity_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    to_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    confidence FLOAT4 DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 1,
    source_article_ids JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (from_entity_id, to_entity_id, relation_type)
);
CREATE INDEX ON entity_relations (from_entity_id);
CREATE INDEX ON entity_relations (to_entity_id);

CREATE TABLE entity_embeddings (
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE PRIMARY KEY,
    embedding vector(768),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 008: Forecasts
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    prediction TEXT NOT NULL,
    confidence FLOAT4 NOT NULL,
    timeframe TEXT,
    risk_level TEXT,
    key_scenarios JSONB DEFAULT '[]',
    key_risks JSONB DEFAULT '[]',
    evidence_summary TEXT,
    chain_of_thought TEXT,
    outcome_occurred BOOLEAN,
    brier_score FLOAT4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);
CREATE INDEX ON forecasts (expires_at);
CREATE INDEX ON forecasts (confidence DESC);

CREATE TABLE forecast_evidence (
    forecast_id UUID REFERENCES forecasts(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    relevance_note TEXT,
    PRIMARY KEY (forecast_id, article_id)
);

-- Migration 009: Watchlists and Alerts
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,              -- References Supabase auth.users
    name TEXT NOT NULL,
    keywords JSONB DEFAULT '[]',
    regions JSONB DEFAULT '[]',
    entity_ids JSONB DEFAULT '[]',
    risk_levels JSONB DEFAULT '["High", "Critical"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON watchlists (user_id);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    trigger_reason TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON alerts (watchlist_id, is_read, created_at DESC);

-- Migration 010: Row-Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles viewable by all authenticated users"
    ON articles FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own watchlists"
    ON watchlists FOR ALL USING (auth.uid() = user_id);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own alerts"
    ON alerts FOR SELECT
    USING (auth.uid() = (SELECT user_id FROM watchlists WHERE id = watchlist_id));

-- Migration 011: Seed default sources
INSERT INTO sources (name, base_url, country, credibility_score) VALUES
    ('NewsAPI', 'https://newsapi.org', 'US', 0.8),
    ('GNews', 'https://gnews.io', 'US', 0.75),
    ('MediaStack', 'https://mediastack.com', 'US', 0.75),
    ('BBC RSS', 'https://feeds.bbci.co.uk', 'UK', 0.9),
    ('Al Jazeera RSS', 'https://www.aljazeera.com', 'QA', 0.8),
    ('Reuters RSS', 'https://reuters.com', 'UK', 0.95),
    ('GDELT', 'https://www.gdeltproject.org', 'US', 0.7);
```

**Critical note**: Run migrations in numbered order. If any fails, fix it before running the next. Supabase SQL Editor shows errors inline.

#### Task 1.3: Docker Compose (Local Dev)

```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
    env_file:
      - ./backend/.env
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    depends_on:
      redis:
        condition: service_healthy

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    command: celery -A app.core.celery_app worker --loglevel=info --concurrency=4
    depends_on:
      redis:
        condition: service_healthy

  beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    command: celery -A app.core.celery_app beat --loglevel=info
    depends_on:
      - worker

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  flower:
    image: mher/flower:2.0
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
```

**Note**: Ollama runs on host machine (not in Docker). Backend reaches it at `host.docker.internal:11434` on Mac/Windows, or the host's docker bridge IP on Linux.

#### Task 1.4: FastAPI Application Skeleton

Key things to implement now (not placeholders):

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # App
    environment: str = "development"
    log_level: str = "INFO"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str

    # Groq (Phase 2)
    groq_api_key: str = ""
    groq_daily_token_budget: int = 500_000

    # Ollama (Phase 2)
    ollama_base_url: str = "http://localhost:11434"

    # Redis (Phase 2)
    redis_url: str = "redis://redis:6379/0"

    # News APIs
    newsapi_key: str = ""
    gnews_key: str = ""
    mediastack_key: str = ""
    gdelt_enabled: bool = True

    # Ingestion schedule
    ingestion_interval_minutes: int = 15
    clustering_interval_minutes: int = 30

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

#### Task 1.5: Supabase Auth Integration

```python
# backend/app/core/security.py
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from app.core.config import settings

security = HTTPBearer()

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """Verify Supabase JWT and return user payload."""
    token = credentials.credentials
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key
            }
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return resp.json()

# Usage in routes:
# @router.get("/protected")
# async def protected_route(user = Depends(verify_token)):
#     return {"user_id": user["id"]}
```

### 4.2 Week 2: Multi-Source Ingestion

#### Task 1.6: Abstract Base Adapter

```python
# backend/app/ingestion/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncIterator

@dataclass
class RawArticle:
    title: str
    url: str
    source_name: str
    content: str | None = None
    published_at: datetime | None = None
    language: str = "en"
    author: str | None = None
    image_url: str | None = None

class BaseSourceAdapter(ABC):
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    @abstractmethod
    async def fetch(self) -> AsyncIterator[RawArticle]:
        """Yield articles. Must handle: rate limiting, errors, empty results."""
        ...

    @abstractmethod
    def source_id(self) -> str:
        """Unique identifier matching sources table name field."""
        ...

    def _is_valid(self, article: RawArticle) -> bool:
        """Quality filter — apply in all adapters before yielding."""
        if not article.title or len(article.title) < 10:
            return False
        if not article.url:
            return False
        if article.content and len(article.content) < 100:
            return False
        if article.title == article.title.upper():  # ALL CAPS = likely clickbait
            return False
        return True
```

#### Task 1.7: Implement 5 Source Adapters

Implement adapters for: NewsAPI, GNews, MediaStack, BBC RSS, GDELT.

**Key implementation requirement for all adapters**:
- Wrap all external calls in `try/except` — one failing source must NOT crash others
- Log each fetch attempt with source name + article count
- Respect rate limits: NewsAPI = 100/day, GNews = 100/day — implement daily counters in Redis (Phase 2) or just use `time.sleep()` in Phase 1

```python
# backend/app/ingestion/adapters/newsapi.py — example pattern
import httpx
from typing import AsyncIterator
from datetime import datetime, timezone
from app.ingestion.base import BaseSourceAdapter, RawArticle
from app.core.logging import get_logger

logger = get_logger(__name__)

class NewsAPIAdapter(BaseSourceAdapter):
    BASE_URL = "https://newsapi.org/v2/everything"
    GEOPOLITICS_QUERY = (
        "geopolitics OR \"foreign policy\" OR sanctions OR diplomacy OR "
        "\"military conflict\" OR \"trade war\" OR NATO OR \"United Nations\""
    )

    def source_id(self) -> str:
        return "NewsAPI"

    async def fetch(self) -> AsyncIterator[RawArticle]:
        if not self.api_key:
            logger.warning("newsapi_key_missing", source=self.source_id())
            return

        params = {
            "q": self.GEOPOLITICS_QUERY,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 50,
            "apiKey": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.BASE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            logger.error("newsapi_fetch_failed", error=str(e))
            return  # Yield nothing — don't crash

        articles = data.get("articles", [])
        logger.info("newsapi_fetched", count=len(articles))

        for item in articles:
            article = RawArticle(
                title=item.get("title", ""),
                url=item.get("url", ""),
                source_name=item.get("source", {}).get("name", "Unknown"),
                content=item.get("content") or item.get("description"),
                published_at=datetime.fromisoformat(
                    item["publishedAt"].replace("Z", "+00:00")
                ) if item.get("publishedAt") else None,
                language="en",
                author=item.get("author"),
                image_url=item.get("urlToImage")
            )
            if self._is_valid(article):
                yield article
```

#### Task 1.8: Deduplicator + Ingestion Coordinator

```python
# backend/app/ingestion/deduplicator.py
import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.repositories.article_repo import ArticleRepository

def compute_hash(title: str, url: str) -> str:
    """SHA-256 on (title + url). Same as V1 but now enforced at DB level too."""
    content = f"{title.strip().lower()}|{url.strip().lower()}"
    return hashlib.sha256(content.encode()).hexdigest()[:64]

async def is_exact_duplicate(db: AsyncSession, hash_id: str) -> bool:
    repo = ArticleRepository(db)
    return await repo.exists_by_hash(hash_id)

# Near-duplicate check is added in Phase 2 when embeddings are available
```

```python
# backend/app/ingestion/coordinator.py
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.ingestion.base import RawArticle
from app.ingestion.deduplicator import compute_hash, is_exact_duplicate
from app.ingestion.adapters.newsapi import NewsAPIAdapter
from app.ingestion.adapters.gnews import GNewsAdapter
from app.ingestion.adapters.rss import RSSAdapter
from app.ingestion.adapters.gdelt import GDELTAdapter
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

RSS_FEEDS = [
    ("BBC RSS", "http://feeds.bbci.co.uk/news/world/rss.xml"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("Reuters", "https://feeds.reuters.com/Reuters/worldNews"),
]

async def run_ingestion(db: AsyncSession) -> dict:
    adapters = [
        NewsAPIAdapter(api_key=settings.newsapi_key),
        GNewsAdapter(api_key=settings.gnews_key),
        RSSAdapter(feeds=RSS_FEEDS),
        GDELTAdapter(),  # No key needed
    ]

    total_fetched = 0
    total_saved = 0
    total_dupes = 0

    for adapter in adapters:
        try:
            async for raw in adapter.fetch():
                total_fetched += 1
                hash_id = compute_hash(raw.title, raw.url)

                if await is_exact_duplicate(db, hash_id):
                    total_dupes += 1
                    continue

                await save_article(db, raw, hash_id)
                total_saved += 1
        except Exception as e:
            # One adapter failing must never stop others
            logger.error("adapter_crashed", adapter=adapter.source_id(), error=str(e))

    logger.info("ingestion_complete",
                fetched=total_fetched,
                saved=total_saved,
                dupes=total_dupes)
    return {"fetched": total_fetched, "saved": total_saved, "duplicates": total_dupes}
```

#### Task 1.9: Article Repository

```python
# backend/app/db/repositories/article_repo.py
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Article   # SQLAlchemy model

class ArticleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def exists_by_hash(self, hash_id: str) -> bool:
        result = await self.db.execute(
            select(func.count()).where(Article.hash_id == hash_id)
        )
        return result.scalar() > 0

    async def save(self, article: Article) -> Article:
        self.db.add(article)
        await self.db.flush()   # Get ID without committing
        await self.db.refresh(article)
        return article

    async def get_unprocessed(self, limit: int = 50) -> list[Article]:
        result = await self.db.execute(
            select(Article)
            .where(Article.is_processed == False)
            .order_by(Article.created_at.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id(self, article_id: str) -> Article | None:
        result = await self.db.execute(
            select(Article).where(Article.id == article_id)
        )
        return result.scalar_one_or_none()
```

#### Task 1.10: REST API Endpoints (Phase 1 Scope)

```python
# Phase 1 endpoints — minimal but functional

GET  /api/v2/articles                 # Paginated list, filter by source/date
GET  /api/v2/articles/{id}            # Single article
POST /api/v2/admin/ingest             # Trigger manual ingestion (admin only)
GET  /api/v2/admin/health             # System health check
GET  /api/v2/admin/stats              # Article count, source breakdown
```

### 4.3 Phase 1 Validation Criteria

**Do not move to Phase 2 until ALL pass:**

```bash
# 1. Ingestion runs without crashing
POST http://localhost:8000/api/v2/admin/ingest
# Expected: {"fetched": N, "saved": M, "duplicates": K}
# N >= 20 (you have real articles), M > 0

# 2. Deduplication works
# Run ingest twice — second run should report 0 new saved
POST http://localhost:8000/api/v2/admin/ingest
POST http://localhost:8000/api/v2/admin/ingest
# Second response: {"saved": 0, "duplicates": N}

# 3. Articles are in Supabase
# Check in Supabase Dashboard → Table Editor → articles
# Should have rows with title, url, hash_id populated

# 4. Auth works
GET http://localhost:8000/api/v2/articles
# Without token: 401 Unauthorized
# With valid Supabase JWT: 200 OK with articles

# 5. Adapter isolation — kill newsapi_key in .env temporarily
# Other adapters (RSS, GDELT) should still return data
# No 500 errors, just lower count

# 6. Docker Compose all services up
docker compose -f docker-compose.dev.yml ps
# All 5 services: Running
```

**Phase 1 Definition of Done:**
- [ ] 5+ news sources fetching real articles
- [ ] Deduplication confirmed working (no duplicate `hash_id` in DB)
- [ ] Supabase Auth verified (protected routes return 401 without token)
- [ ] RLS confirmed (user can only see their own watchlists — verify via direct SQL in Supabase)
- [ ] All Docker Compose services healthy
- [ ] 50+ articles in Supabase after 3 ingestion runs

---

## 5. Phase 2 — AI Core

**Duration**: 3 weeks  
**Goal**: Every ingested article gets: sentiment label, bias label, LLM summary, translation (if non-English), strategic score, and embedding. Pipeline is fully async via Celery.  
**Branch**: `v2/phase-2`

### 5.1 Week 3: Celery + Redis + Model Clients

#### Task 2.1: Celery Application Setup

```python
# backend/app/core/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "geopolitical",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.agents.analysis_agent",
        "app.agents.embedding_agent",
        "app.agents.entity_agent",
        "app.agents.clustering_agent",
        "app.agents.forecasting_agent",
        "app.agents.alert_agent",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,                        # Don't ack until task completes
    worker_prefetch_multiplier=1,               # One task at a time per worker
    task_reject_on_worker_lost=True,            # Re-queue if worker dies
    task_track_started=True,
    result_expires=3600,                        # Results expire in 1 hour
)

# Scheduled tasks (APScheduler-style via Celery Beat)
celery_app.conf.beat_schedule = {
    "ingest-news-every-15min": {
        "task": "agents.run_ingestion",
        "schedule": 15 * 60,                   # seconds
    },
    "cluster-events-every-30min": {
        "task": "agents.run_event_clustering",
        "schedule": 30 * 60,
    },
}
```

#### Task 2.2: Groq Client Wrapper

```python
# backend/app/ai/groq_client.py
from groq import AsyncGroq
import asyncio, json, re
from app.core.config import settings
from app.core.logging import get_logger
import redis.asyncio as aioredis

logger = get_logger(__name__)

class GroqClient:
    """Thin wrapper around Groq API with:
    - Daily token budget tracking (Redis counter)
    - Structured JSON output parsing
    - Automatic retry on rate limit (429)
    """

    def __init__(self):
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._redis: aioredis.Redis | None = None

    async def _check_budget(self, estimated_tokens: int = 500) -> bool:
        """Return False if daily budget exceeded."""
        r = await self._get_redis()
        used = int(await r.get("groq_tokens_today") or 0)
        return (used + estimated_tokens) <= settings.groq_daily_token_budget

    async def chat_json(
        self,
        model: str,
        system: str,
        user: str,
        max_tokens: int = 500,
        retries: int = 3
    ) -> dict:
        """Call Groq API and parse JSON response. Returns {} on failure — never raises."""
        if not await self._check_budget(max_tokens):
            logger.warning("groq_budget_exceeded")
            return {}

        for attempt in range(retries):
            try:
                resp = await self._client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user}
                    ],
                    max_tokens=max_tokens,
                    temperature=0.1,    # Low temp for structured outputs
                    response_format={"type": "json_object"}
                )
                content = resp.choices[0].message.content
                # Track token usage
                r = await self._get_redis()
                await r.incrby("groq_tokens_today", resp.usage.total_tokens)
                await r.expire("groq_tokens_today", 86400)  # Reset daily
                return json.loads(content)

            except Exception as e:
                if "429" in str(e) and attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                logger.error("groq_call_failed", error=str(e), attempt=attempt)
                return {}

        return {}

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

# Singleton — reused across all agents
groq_client = GroqClient()
```

**Critical**: `response_format={"type": "json_object"}` forces Groq to return valid JSON. Without this, you'll spend hours debugging malformed outputs.

#### Task 2.3: Ollama Client Wrapper

```python
# backend/app/ai/ollama_client.py
import httpx
import numpy as np
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class OllamaClient:
    """Client for local Ollama models.
    - Embeddings: nomic-embed-text (768-dim)
    - Entity extraction: qwen2.5:3b
    - KG triples: llama3.2:3b
    """

    async def embed(self, text: str) -> list[float]:
        """Embed a single text. Returns 768-dim float list."""
        return (await self.embed_batch([text]))[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts. More efficient than calling embed() in a loop."""
        embeddings = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for text in texts:
                try:
                    resp = await client.post(
                        f"{settings.ollama_base_url}/api/embeddings",
                        json={"model": "nomic-embed-text", "prompt": text[:2000]}
                    )
                    resp.raise_for_status()
                    embeddings.append(resp.json()["embedding"])
                except Exception as e:
                    logger.error("ollama_embed_failed", error=str(e))
                    embeddings.append([0.0] * 768)  # Zero vector as fallback
        return embeddings

    async def generate_json(self, model: str, prompt: str) -> dict:
        """Generate structured JSON output from a local model."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": model, "prompt": prompt, "format": "json", "stream": False}
                )
                resp.raise_for_status()
                import json
                return json.loads(resp.json()["response"])
            except Exception as e:
                logger.error("ollama_generate_failed", model=model, error=str(e))
                return {}

ollama_client = OllamaClient()
```

#### Task 2.4: Model Router

```python
# backend/app/ai/model_router.py
from enum import Enum

class TaskType(str, Enum):
    EMBEDDING = "embedding"
    SENTIMENT = "sentiment"
    BIAS = "bias"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    ENTITY_EXTRACTION = "entity_extraction"
    KG_EXTRACTION = "kg_extraction"
    STRATEGIC_SCORING = "strategic_scoring"
    FORECASTING = "forecasting"
    RAG_QA = "rag_qa"
    EVENT_TITLE = "event_title"

def get_model(task: TaskType) -> tuple[str, str]:
    """Returns (model_name, provider). Provider: 'groq' | 'ollama'"""
    routing = {
        TaskType.EMBEDDING:           ("nomic-embed-text",          "ollama"),
        TaskType.SENTIMENT:           ("llama-3.1-8b-instant",      "groq"),
        TaskType.BIAS:                ("llama-3.1-8b-instant",      "groq"),
        TaskType.TRANSLATION:         ("llama-3.1-8b-instant",      "groq"),
        TaskType.SUMMARIZATION:       ("llama-3.1-8b-instant",      "groq"),
        TaskType.ENTITY_EXTRACTION:   ("qwen2.5:3b",                "ollama"),
        TaskType.KG_EXTRACTION:       ("llama3.2:3b",               "ollama"),
        TaskType.STRATEGIC_SCORING:   ("llama-3.1-8b-instant",      "groq"),
        TaskType.FORECASTING:         ("llama-3.3-70b-versatile",   "groq"),
        TaskType.RAG_QA:              ("llama-3.3-70b-versatile",   "groq"),
        TaskType.EVENT_TITLE:         ("llama-3.1-8b-instant",      "groq"),
    }
    return routing[task]
```

### 5.2 Week 4: Analysis Pipeline

#### Task 2.5: Analysis Agent (The Core Celery Task)

Prompts are the most important part. Test each one independently before wiring into the agent.

```python
# backend/app/agents/analysis_agent.py
# ANALYSIS PROMPTS — test these manually via Groq Playground first

SENTIMENT_PROMPT_SYSTEM = """You are a geopolitical news analyst. Analyze the sentiment 
of news articles about international relations, conflicts, and diplomacy.
Always respond with a valid JSON object."""

SENTIMENT_PROMPT_USER = """Analyze the sentiment of this news article:

Title: {title}
Content: {content}

Respond ONLY with this JSON:
{{
  "label": "<Negative|Neutral|Positive>",
  "score": <0.0-1.0>,
  "reasoning": "<1 sentence>"
}}"""

BIAS_PROMPT_SYSTEM = """You are a media analysis expert specializing in detecting 
editorial bias in news reporting. Always respond with valid JSON."""

BIAS_PROMPT_USER = """Detect editorial bias in this news article:

Title: {title}
Content: {content}

Look for: loaded language, selective framing, omission of context, 
one-sided sourcing, emotional manipulation.

Respond ONLY with this JSON:
{{
  "label": "<Biased|Non-biased>",
  "score": <0.0-1.0 where 1.0 = highly biased>,
  "bias_type": "<political|emotional|omission|framing|none>",
  "reasoning": "<1 sentence>"
}}"""

STRATEGIC_SCORER_SYSTEM = """You are a senior geopolitical intelligence analyst. 
Rate the strategic importance of news articles for national security analysts.
Always respond with valid JSON."""

STRATEGIC_SCORER_USER = """Rate the strategic importance of this geopolitical event:

Title: {title}
Summary: {summary}
Sentiment: {sentiment_label} ({sentiment_score:.2f})
Entities involved: {entities}

Score 0-100 based on: major power involvement, conflict escalation risk,
economic consequences, number of affected nations, urgency.

Respond ONLY with this JSON:
{{
  "strategic_score": <int 0-100>,
  "risk_level": "<Low|Medium|High|Critical>",
  "key_drivers": ["<driver1>", "<driver2>"],
  "affected_regions": ["<region1>"],
  "reasoning": "<2 sentences>"
}}"""
```

**Architecture decision**: Run sentiment, bias, and summarization as `asyncio.gather()` — they're independent. Run strategic scoring AFTER because it uses sentiment + summary as inputs.

#### Task 2.6: Embedding Agent

```python
# backend/app/agents/embedding_agent.py
# Chunk articles and embed each chunk into pgvector

CHUNK_SIZE = 512       # tokens (approximate — use character count: 512 * 4 = ~2048 chars)
CHUNK_OVERLAP = 64     # tokens

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Simple character-based chunking. Replace with tiktoken if token-accuracy needed."""
    char_size = chunk_size * 4
    char_overlap = overlap * 4
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + char_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = end - char_overlap
    return chunks
```

**Edge case**: Articles with no content (title-only stubs) — embed the title alone. Never emit zero vectors into pgvector — they'll pollute similarity searches.

#### Task 2.7: Language Detection + Translation

```python
# Detection: use langdetect (carry from V1)
# Translation: Groq LLM (replaces Google Translate)

TRANSLATION_PROMPT_USER = """Translate the following text to English.
Preserve the tone, nuance, and geopolitical terminology exactly.
Do not summarize or add commentary.

Text to translate ({source_lang}):
{text}

Respond ONLY with this JSON:
{{
  "translated_text": "<translation here>",
  "detected_language": "<ISO 639-1 code>"
}}"""
```

**Cost note**: Translation via Groq uses tokens. Only translate articles where `langdetect` confidence > 0.8 AND detected language != 'en'. Skip translation for short titles.

### 5.3 Week 5: Pipeline Integration + Scheduler

#### Task 2.8: Ingestion → Analysis Chain

```
New article saved → push article_id to Redis Stream "raw_articles"
                 → Celery worker picks it up → analyze_article.delay(article_id)
                 → On analysis complete → embed_article.delay(article_id)
```

This is the critical wiring step. The ingestion coordinator from Phase 1 needs one addition:

```python
# In coordinator.py, after save_article():
from app.agents.analysis_agent import analyze_article
analyze_article.delay(str(saved_article.id))  # Fire and forget
```

#### Task 2.9: Celery Beat for Scheduled Ingestion

Test that Celery Beat triggers ingestion automatically every 15 minutes:

```bash
# Start all services
docker compose -f docker-compose.dev.yml up

# Watch worker logs
docker compose logs -f worker

# You should see every 15 min:
# [INFO] agents.run_ingestion: Starting scheduled ingestion
# [INFO] ingestion_complete: fetched=47, saved=12, duplicates=35
# [INFO] agents.analyze_article: article_id=xxx
```

### 5.4 Phase 2 Validation Criteria

```bash
# 1. Full pipeline end-to-end
# Trigger ingest → wait 30 seconds → query analysis table
GET /api/v2/articles/{any_id}
# Response must include: sentiment_label, bias_label, strategic_score, summary

# 2. Embeddings exist
# Check Supabase: article_embeddings table should have rows
# SELECT COUNT(*), AVG(chunk_index) FROM article_embeddings;
# Expect: count > 0, avg chunk_index close to 0 (most articles are 1 chunk)

# 3. Model router correctness
python -c "
from app.ai.model_router import get_model, TaskType
assert get_model(TaskType.EMBEDDING) == ('nomic-embed-text', 'ollama')
assert get_model(TaskType.FORECASTING) == ('llama-3.3-70b-versatile', 'groq')
print('Router: OK')
"

# 4. Budget tracking works
# Check Redis after running pipeline
redis-cli GET groq_tokens_today
# Should be > 0

# 5. Celery worker processes tasks
docker compose logs worker | grep "analysis_complete"
# Should see entries within 60s of articles being ingested

# 6. Translation fires for non-English content
# Insert a test article with language='de' manually in Supabase
# Trigger analyze_article.delay(that_id)
# Check article_analysis.translated_content is populated

# 7. Partial failure handling
# Kill Ollama: pkill ollama
# Run pipeline — embedding agent should fail but analysis agent should succeed
# embedding_agent logs: "ollama_embed_failed: Connection refused" (no crash)
# analysis_agent logs: "analysis_complete" (still works)
```

**Phase 2 Definition of Done:**
- [ ] 100% of new articles get analyzed within 60s of ingestion (on dev machine)
- [ ] article_analysis table populated for all articles
- [ ] Embeddings in pgvector for all articles
- [ ] Groq daily budget counter tracked in Redis
- [ ] Celery Beat triggers ingestion on schedule
- [ ] Non-English articles are translated (test with 1 manual German article)
- [ ] Worker crash recovery: restart worker → unprocessed articles get re-queued

---

## 6. Phase 3 — Advanced AI

**Duration**: 3 weeks  
**Goal**: Events auto-detected and clustered. Knowledge graph growing. RAG Q&A working. Forecasts generating for High/Critical events.  
**Branch**: `v2/phase-3`

### 6.1 Week 5–6: Entity Extraction + Knowledge Graph

#### Task 3.1: Entity Extraction Agent

This runs as a Celery task triggered after analysis is complete.

**Prompt engineering note**: `qwen2.5:3b` is smaller and sometimes produces invalid JSON. Add schema validation + retry logic:

```python
# backend/app/agents/entity_agent.py
import json
from app.ai.ollama_client import ollama_client
from app.core.logging import get_logger

logger = get_logger(__name__)

ENTITY_EXTRACTION_PROMPT = """Extract entities and relationships from this news article.

Article: {article_text}

Rules:
- Only extract entities that are explicitly named in the article
- Only extract relationships that are directly stated, not implied
- Types: Person | Country | Organization | Treaty | Agreement | Concept
- Relation types: leads|member_of|opposes|supports|sanctions|alliance_with|
  conflict_with|negotiates_with|signed|owns|located_in|accused_of

Respond ONLY with this JSON (no markdown, no extra text):
{{
  "entities": [
    {{"name": "string", "type": "string", "description": "string"}}
  ],
  "relations": [
    {{"from": "entity_name", "relation": "relation_type", "to": "entity_name", "confidence": 0.0}}
  ]
}}"""

async def extract_entities(article_id: str, article_text: str) -> dict:
    prompt = ENTITY_EXTRACTION_PROMPT.format(
        article_text=article_text[:2500]  # qwen2.5:3b context limit ~4K tokens
    )

    for attempt in range(2):  # 2 attempts for small local model
        result = await ollama_client.generate_json("qwen2.5:3b", prompt)

        # Validate structure
        if (
            isinstance(result, dict)
            and "entities" in result
            and "relations" in result
            and isinstance(result["entities"], list)
        ):
            return result

        logger.warning("entity_extraction_retry", article_id=article_id, attempt=attempt)

    logger.error("entity_extraction_failed", article_id=article_id)
    return {"entities": [], "relations": []}
```

#### Task 3.2: Knowledge Graph Upsert

```python
# backend/app/db/repositories/entity_repo.py
# Key design: entity identity = (name, type) pair — unique constraint in DB

async def upsert_entity(db: AsyncSession, name: str, type: str, description: str | None) -> str:
    """Insert or update entity. Returns entity UUID."""
    # Use PostgreSQL ON CONFLICT for atomic upsert
    result = await db.execute(
        """
        INSERT INTO entities (name, type, description, mention_count, last_seen)
        VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT (name, type) DO UPDATE SET
            mention_count = entities.mention_count + 1,
            last_seen = NOW(),
            description = COALESCE(EXCLUDED.description, entities.description)
        RETURNING id
        """,
        [name, type, description]
    )
    return str(result.scalar())

async def upsert_relation(
    db: AsyncSession,
    from_id: str, to_id: str, relation_type: str,
    confidence: float, article_id: str
) -> None:
    """Upsert relation with evidence tracking."""
    await db.execute(
        """
        INSERT INTO entity_relations
            (from_entity_id, to_entity_id, relation_type, confidence, evidence_count, source_article_ids)
        VALUES ($1, $2, $3, $4, 1, $5::jsonb)
        ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO UPDATE SET
            evidence_count = entity_relations.evidence_count + 1,
            confidence = (entity_relations.confidence * entity_relations.evidence_count + $4)
                        / (entity_relations.evidence_count + 1),
            source_article_ids = entity_relations.source_article_ids || $5::jsonb,
            updated_at = NOW()
        """,
        [from_id, to_id, relation_type, confidence, f'["{article_id}"]']
    )
```

**Edge cases to handle**:
- Self-referential relations (`from == to`) → skip
- Relations where entity names don't match any extracted entity → skip (don't create orphaned relations)
- Circular relations → allowed in the graph, handled by the recursive CTE query

#### Task 3.3: Graph Traversal API

```python
# GET /api/v2/entities/{id}/graph?hops=2
# Returns subgraph for D3 force visualization

async def get_entity_subgraph(entity_id: str, hops: int = 2) -> dict:
    """Recursive CTE traversal. Max hops=3 to prevent huge responses."""
    hops = min(hops, 3)
    nodes = await db.execute("""
        WITH RECURSIVE entity_graph AS (
            SELECT e.id, e.name, e.type, e.mention_count, 0 AS depth,
                   ARRAY[e.id::text] AS path
            FROM entities e WHERE e.id = $1
            UNION ALL
            SELECT e2.id, e2.name, e2.type, e2.mention_count, eg.depth + 1,
                   eg.path || e2.id::text
            FROM entity_graph eg
            JOIN entity_relations er ON er.from_entity_id = eg.id
            JOIN entities e2 ON e2.id = er.to_entity_id
            WHERE eg.depth < $2 AND NOT (e2.id::text = ANY(eg.path))
        )
        SELECT DISTINCT id, name, type, mention_count, depth FROM entity_graph
        ORDER BY depth, mention_count DESC LIMIT 100
    """, [entity_id, hops])

    edges = await db.execute("""
        SELECT er.from_entity_id, er.to_entity_id, er.relation_type, er.confidence
        FROM entity_relations er
        WHERE er.from_entity_id = ANY($1) OR er.to_entity_id = ANY($1)
    """, [[str(n["id"]) for n in nodes]])

    return {"nodes": list(nodes), "edges": list(edges)}
```

### 6.2 Week 6–7: HDBSCAN Event Clustering

#### Task 3.4: Clustering Agent

**Why HDBSCAN over K-Means**: K-Means requires `k` upfront — you can't know how many events exist in advance. HDBSCAN discovers clusters of arbitrary shape and marks noise points. This is the correct algorithm for this use case.

```python
# backend/app/agents/clustering_agent.py
import numpy as np
import hdbscan                              # pip install hdbscan
from sklearn.metrics.pairwise import cosine_similarity

# Parameters — explained:
# min_cluster_size=3: need at least 3 articles to form an event
# cluster_selection_epsilon=0.15: allow slightly loose clusters for breaking news
#     (where articles use varied language about the same event)
# metric='precomputed': we compute our own distance matrix (cosine distance)

HDBSCAN_PARAMS = {
    "min_cluster_size": 3,
    "min_samples": 2,
    "metric": "precomputed",
    "cluster_selection_epsilon": 0.15,
}
```

**Performance note**: `cosine_similarity` on 2000×2000 matrix = 2000² = 4M operations. Fine in NumPy. If you exceed 5000 articles/48hr window (unlikely at college scale), add approximate methods later.

#### Task 3.5: Event-to-Cluster Matching

When HDBSCAN produces a new cluster, check if it should merge with an existing event:

```python
async def find_matching_event(centroid: list[float], threshold: float = 0.85) -> str | None:
    """Find an existing recent event whose centroid is close to this cluster's centroid."""
    result = await db.execute("""
        SELECT id
        FROM events
        WHERE centroid IS NOT NULL
        AND last_updated > NOW() - INTERVAL '7 days'
        ORDER BY centroid <=> $1::vector
        LIMIT 1
    """, [centroid])
    row = result.fetchone()
    if not row:
        return None
    # Verify similarity threshold
    existing_centroid = await get_event_centroid(row.id)
    sim = cosine_similarity([centroid], [existing_centroid])[0][0]
    return str(row.id) if sim >= threshold else None
```

#### Task 3.6: Event Metadata Generation

```python
EVENT_GENERATION_PROMPT = """These news articles cover the same geopolitical event.
Generate a concise, informative event record.

Articles (summaries):
{article_summaries}

Respond ONLY with valid JSON:
{{
  "title": "<Concise title, max 80 chars, e.g. 'US-China Semiconductor Export Restrictions'>",
  "description": "<2-3 sentences: what is happening, who is involved, why it matters>",
  "status": "<ongoing|resolved|escalating|de-escalating>",
  "risk_level": "<Low|Medium|High|Critical>",
  "involved_entities": ["<entity1>", "<entity2>"],
  "affected_regions": ["<region1>"]
}}"""
```

### 6.3 Week 7–8: RAG System

#### Task 3.7: Hybrid Retrieval

This is technically the most complex part. Implement it as a pure function — testable independently.

```python
# backend/app/rag/retriever.py
# Implements RRF (Reciprocal Rank Fusion) over vector + FTS results

async def hybrid_retrieve(
    db: AsyncSession,
    query: str,
    query_embedding: list[float],
    top_k: int = 5,
    date_filter_days: int = 90
) -> list[RetrievedChunk]:
    """
    Two-stage retrieval:
    Stage 1: Get top-20 from vector search + top-20 from FTS
    Stage 2: RRF merge → top-K
    """
    results = await db.execute("""
        WITH vector_results AS (
            SELECT ae.article_id, ae.chunk_text, ae.chunk_index,
                   ROW_NUMBER() OVER (ORDER BY ae.embedding <=> $1::vector) AS v_rank
            FROM article_embeddings ae
            JOIN articles a ON a.id = ae.article_id
            WHERE a.published_at > NOW() - ($3 || ' days')::INTERVAL
            ORDER BY ae.embedding <=> $1::vector
            LIMIT 20
        ),
        fts_results AS (
            SELECT a.id AS article_id,
                   NULL::text AS chunk_text,
                   0 AS chunk_index,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', $2)) DESC
                   ) AS f_rank
            FROM articles a
            WHERE a.search_vector @@ plainto_tsquery('english', $2)
            AND a.published_at > NOW() - ($3 || ' days')::INTERVAL
            LIMIT 20
        ),
        rrf AS (
            SELECT COALESCE(vr.article_id, fr.article_id) AS article_id,
                   COALESCE(vr.chunk_text, '') AS chunk_text,
                   COALESCE(vr.chunk_index, 0) AS chunk_index,
                   COALESCE(1.0/(60 + vr.v_rank), 0) +
                   COALESCE(1.0/(60 + fr.f_rank), 0) AS rrf_score
            FROM vector_results vr FULL OUTER JOIN fts_results fr
            ON vr.article_id = fr.article_id
        )
        SELECT r.article_id, r.chunk_text, r.rrf_score,
               a.title, a.url, s.name AS source_name, a.published_at
        FROM rrf r
        JOIN articles a ON a.id = r.article_id
        LEFT JOIN sources s ON s.id = a.source_id
        ORDER BY r.rrf_score DESC
        LIMIT $4
    """, [query_embedding, query, str(date_filter_days), top_k])

    return [RetrievedChunk(**row) for row in results.mappings()]
```

#### Task 3.8: RAG Generation with Citation

```python
# backend/app/rag/query_engine.py
RAG_SYSTEM_PROMPT = """You are a geopolitical intelligence analyst with access to a 
curated database of recent news articles. Answer questions using ONLY the provided context.

Rules:
- Cite sources as [Source 1], [Source 2], etc.
- If the context lacks sufficient information, say so explicitly — never fabricate
- Be analytical: highlight causality, not just facts
- If sources conflict, acknowledge the disagreement
- End with: [Confidence: High/Medium/Low]"""

async def rag_query(question: str) -> dict:
    # 1. Embed question
    q_embedding = await ollama_client.embed(question)

    # 2. Retrieve hybrid results
    chunks = await hybrid_retrieve(db, question, q_embedding, top_k=5)

    if not chunks:
        return {"answer": "No relevant articles found in the database for this query.",
                "sources": []}

    # 3. Build context with citations
    context = "\n\n---\n\n".join([
        f"[Source {i+1}] {c.title} ({c.published_at.date()}, {c.source_name})\n{c.chunk_text}"
        for i, c in enumerate(chunks)
    ])

    # 4. Generate via Groq 70b
    answer = await groq_client.chat_json(
        model="llama-3.3-70b-versatile",
        system=RAG_SYSTEM_PROMPT,
        user=f"Context:\n{context}\n\nQuestion: {question}",
        max_tokens=1000
    )

    return {
        "answer": answer.get("answer", ""),
        "sources": [{"id": str(c.article_id), "title": c.title, "url": c.url} for c in chunks]
    }
```

**Important**: Test RAG in isolation first with a CLI script before wiring into FastAPI:
```bash
python -c "
import asyncio
from app.rag.query_engine import rag_query
result = asyncio.run(rag_query('What are the latest developments in US-China trade relations?'))
print(result['answer'][:500])
print('Sources:', len(result['sources']))
"
```

### 6.4 Week 8: Forecasting Engine

#### Task 3.9: Forecasting Agent

Only trigger for events with `risk_level IN ('High', 'Critical')` — this is by design (cost + quality — 70b model).

```python
# backend/app/agents/forecasting_agent.py
FORECAST_PROMPT = """You are a senior geopolitical analyst producing an intelligence forecast.

## Current Event
{event_title}: {event_description}
Risk: {risk_level} | Actors: {actors} | Regions: {regions}

## Recent Context (last 30 days from our database)
{rag_context}

## Historical Precedents
{historical_context}

## Sentiment Trend (30 days, affected regions)
{sentiment_trend}

## Actor Relationships
{entity_relationships}

Step through your reasoning, then provide:

{{
  "topic": "string",
  "prediction": "<Specific, falsifiable statement — e.g. 'China will impose 
                  additional tariffs on US semiconductors within 60 days'>",
  "confidence": <0.0-1.0>,
  "timeframe": "string",
  "risk_level": "string",
  "key_scenarios": [{{"scenario":"string","probability":0.0,"triggers":["string"]}}],
  "key_risks": ["string"],
  "evidence_summary": "string",
  "chain_of_thought": "string"
}}"""
```

#### Task 3.10: Brier Score Tracking

This is a small but high-impact feature for your portfolio. Implement it simply:

```python
# When manually resolving a forecast (admin endpoint):
async def resolve_forecast(forecast_id: str, occurred: bool) -> None:
    forecast = await get_forecast(forecast_id)
    brier_score = (forecast.confidence - float(occurred)) ** 2
    # Brier score: 0.0 = perfect, 0.25 = random guessing, 1.0 = perfectly wrong
    await update_forecast(forecast_id, {
        "outcome_occurred": occurred,
        "brier_score": brier_score,
        "resolved_at": datetime.utcnow()
    })

# GET /api/v2/forecasts/accuracy — returns running average Brier score
# Portfolio talking point: "Average Brier Score of X across N resolved forecasts"
```

### 6.5 Phase 3 Validation Criteria

```bash
# 1. Entity extraction working
GET /api/v2/entities?limit=20
# Expect: 20+ entities with diverse types (Person, Country, Organization)

# 2. Knowledge graph has edges
GET /api/v2/entities/{any_id}/graph?hops=1
# Expect: {"nodes": [...], "edges": [...]} — edges > 0

# 3. Events auto-detected
# Wait 30 minutes after articles are in DB
GET /api/v2/events
# Expect: events with 3+ articles each, LLM-generated titles

# 4. RAG works end-to-end
POST /api/v2/analyst/query
Body: {"question": "What are the most significant geopolitical tensions this week?"}
# Expect: answer with [Source N] citations, sources array populated

# 5. Forecasting fires for High/Critical events
POST /api/v2/forecasts/generate
Body: {"event_id": "<a High or Critical event id>"}
# Expect: forecast with prediction, confidence (0-1), key_scenarios

# 6. Clustering silhouette score >= 0.4 (minimum acceptable)
python -c "
from sklearn.metrics import silhouette_score
# Load cluster assignments from DB and compute
# print(f'Silhouette: {score:.3f}')
"
```

**Phase 3 Definition of Done:**
- [ ] 50+ entities in knowledge graph after 1 day of ingestion
- [ ] At least 3 events auto-detected and clustered
- [ ] RAG returns cited answers for 5 test questions
- [ ] 1+ forecast generated for a High/Critical event
- [ ] Brier score endpoint returns meaningful data
- [ ] All agents handle failures gracefully (no worker crashes)

---

## 7. Phase 4 — Frontend Dashboard

**Duration**: 3 weeks  
**Goal**: Full Next.js 14 dashboard with D3 world map, live WebSocket feed, entity graph, AI analyst chat, forecasting view.  
**Branch**: `v2/phase-4`

### 7.1 Week 9: Next.js Setup + Core Layout

#### Task 4.1: Initialize Next.js Project

```bash
cd v2/
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd frontend
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  @tanstack/react-query \
  zustand \
  recharts \
  d3 \
  @types/d3 \
  shadcn-ui \
  lucide-react \
  date-fns

# Init shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge progress dialog scroll-area
```

#### Task 4.2: Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                  # Root layout: nav + providers
│   ├── page.tsx                    # / → Global Risk Dashboard
│   ├── feed/page.tsx               # /feed → Live News Feed
│   ├── events/
│   │   ├── page.tsx                # /events → Event List
│   │   └── [id]/page.tsx           # /events/[id] → Event Detail
│   ├── entities/
│   │   ├── page.tsx                # /entities → Entity List
│   │   └── [id]/page.tsx           # /entities/[id] → Entity + Graph
│   ├── forecast/page.tsx           # /forecast → Forecasting Dashboard
│   ├── analyst/page.tsx            # /analyst → AI Chat
│   ├── analytics/page.tsx          # /analytics → Charts + Trends
│   └── auth/
│       ├── login/page.tsx
│       └── callback/page.tsx       # Supabase OAuth callback
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Providers.tsx           # React Query + Zustand context
│   ├── maps/
│   │   └── GlobalRiskMap.tsx       # D3 choropleth
│   ├── feed/
│   │   ├── LiveNewsFeed.tsx        # WebSocket real-time feed
│   │   └── ArticleCard.tsx
│   ├── entities/
│   │   └── EntityGraph.tsx         # D3 force-directed graph
│   ├── analyst/
│   │   └── AIAnalystChat.tsx       # Streaming RAG chat
│   ├── forecast/
│   │   └── ForecastCard.tsx
│   └── ui/                         # Shadcn components (auto-generated)
├── lib/
│   ├── api.ts                      # Typed API client
│   ├── supabase.ts                 # Supabase client
│   └── websocket.ts                # WebSocket manager
├── store/
│   └── realtime.ts                 # Zustand real-time store
└── types/
    └── index.ts                    # TypeScript interfaces matching backend schemas
```

#### Task 4.3: TypeScript Type Definitions

These must exactly match the backend Pydantic schemas. Keep them in sync.

```typescript
// frontend/src/types/index.ts
export interface Article {
  id: string;
  title: string;
  content_raw: string | null;
  url: string;
  source_name: string;
  published_at: string | null;
  language: string;
  created_at: string;
  analysis?: ArticleAnalysis;
}

export interface ArticleAnalysis {
  sentiment_label: "Negative" | "Neutral" | "Positive" | null;
  sentiment_score: number | null;
  bias_label: "Biased" | "Non-biased" | null;
  bias_score: number | null;
  strategic_score: number | null;
  risk_level: "Low" | "Medium" | "High" | "Critical" | null;
  summary: string | null;
  key_drivers: string[];
  affected_regions: string[];
}

export interface Entity {
  id: string;
  name: string;
  type: "Person" | "Country" | "Organization" | "Treaty" | "Agreement" | "Concept";
  description: string | null;
  mention_count: number;
  global_risk_score: number;
}

export interface EntityGraphData {
  nodes: (Entity & { depth: number })[];
  edges: {
    from_entity_id: string;
    to_entity_id: string;
    relation_type: string;
    confidence: number;
  }[];
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  status: string;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  affected_regions: string[];
  article_count: number;
  last_updated: string;
}

export interface Forecast {
  id: string;
  topic: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  risk_level: string;
  key_scenarios: { scenario: string; probability: number; triggers: string[] }[];
  key_risks: string[];
  evidence_summary: string;
  brier_score: number | null;
  created_at: string;
}

// Risk level → Tailwind color class mapping
export const RISK_COLORS: Record<string, string> = {
  Low: "text-green-600 bg-green-50",
  Medium: "text-yellow-600 bg-yellow-50",
  High: "text-orange-600 bg-orange-50",
  Critical: "text-red-600 bg-red-50",
};
```

### 7.2 Week 9–10: Core Dashboard Components

#### Task 4.4: Global Risk Map (D3 Choropleth)

**Implementation note**: D3 and React have a fundamental conflict — D3 mutates the DOM, React owns the DOM. Solution: give D3 full control of one `<svg>` element via `useRef`, never render D3 output as React state.

```typescript
// frontend/src/components/maps/GlobalRiskMap.tsx
"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"  // npm install topojson-client @types/topojson-client

const RISK_SCALE = d3.scaleOrdinal<string>()
  .domain(["Low", "Medium", "High", "Critical"])
  .range(["#22c55e", "#eab308", "#f97316", "#ef4444"])

export function GlobalRiskMap({ riskData }: { riskData: Record<string, string> }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const width = 960, height = 500
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)

    const projection = d3.geoNaturalEarth1()
      .scale(160).translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Fetch world topology (use unpkg CDN or bundle locally)
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((world: any) => {
        const countries = feature(world, world.objects.countries) as any

        svg.selectAll("path")
          .data(countries.features)
          .join("path")
          .attr("d", path as any)
          .attr("fill", (d: any) => {
            const countryName = d.properties?.name
            const risk = riskData[countryName]
            return risk ? RISK_SCALE(risk) : "#e5e7eb"
          })
          .attr("stroke", "#9ca3af")
          .attr("stroke-width", 0.5)
          .on("click", (_, d: any) => {
            // Navigate to /feed?region=<country_name>
            window.location.href = `/feed?region=${encodeURIComponent(d.properties?.name)}`
          })
      })
  }, [riskData])

  return <svg ref={svgRef} className="w-full h-full" />
}
```

#### Task 4.5: Live News Feed with WebSocket

```typescript
// frontend/src/components/feed/LiveNewsFeed.tsx
"use client"
import { useEffect } from "react"
import { useRealtimeStore } from "@/store/realtime"
import { ArticleCard } from "./ArticleCard"
import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchArticles } from "@/lib/api"

export function LiveNewsFeed() {
  const { liveArticles, addArticle } = useRealtimeStore()

  // WebSocket connection for real-time articles
  useEffect(() => {
    const token = supabase.auth.getSession() // Get JWT
    const ws = new WebSocket(`ws://localhost:8000/ws/feed?token=${token}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "new_article") {
        addArticle(data.data)
      }
    }

    ws.onerror = (e) => console.error("WS error:", e)

    return () => ws.close()
  }, [])

  // Paginated historical articles via React Query
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["articles"],
    queryFn: ({ pageParam }) => fetchArticles({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.next_cursor,
  })

  const allArticles = data?.pages.flatMap(p => p.items) ?? []

  return (
    <div className="space-y-4">
      {/* Live articles at top */}
      {liveArticles.map(article => (
        <ArticleCard key={article.id} article={article} isNew />
      ))}
      {/* Historical articles */}
      {allArticles.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}
```

#### Task 4.6: Entity Force Graph (D3)

```typescript
// frontend/src/components/entities/EntityGraph.tsx
// Same D3/React isolation pattern as the map
// Node color = entity type, Node size = mention_count
// Edge thickness = relation confidence
// Click node → navigate to /entities/[id]

// Critical: D3 force simulation is expensive. Debounce re-renders.
// Use d3.forceSimulation with:
//   - forceLink: connects edges
//   - forceManyBody: repulsion between nodes (strength = -300)
//   - forceCenter: centers the graph
//   - forceCollide: prevents node overlap
```

#### Task 4.7: AI Analyst Chat (Streaming SSE)

```typescript
// frontend/src/components/analyst/AIAnalystChat.tsx
async function sendMessage(question: string) {
  setIsLoading(true)
  setCurrentAnswer("")

  // Use SSE (EventSource) for token-by-token streaming
  const response = await fetch("/api/v2/analyst/query", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ question })
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split("\n").filter(l => l.startsWith("data: "))

    for (const line of lines) {
      const data = JSON.parse(line.slice(6))
      if (data.type === "token") {
        setCurrentAnswer(prev => prev + data.content)
      } else if (data.type === "done") {
        setSources(data.sources)
        setIsLoading(false)
      }
    }
  }
}
```

**Backend SSE endpoint** (add to Phase 3 RAG engine):
```python
# GET /api/v2/analyst/query → StreamingResponse
from fastapi.responses import StreamingResponse

@router.post("/analyst/query")
async def analyst_query_stream(request: QueryRequest, user = Depends(verify_token)):
    async def generate():
        # Stream tokens from Groq
        async for chunk in groq_client.stream_chat(...):
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'sources': sources})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 7.3 Week 11: Remaining Pages

#### Task 4.8: Page Completion Order

Build in this order (highest recruiter impact first):
1. `/` Dashboard (risk map + events + live feed stub) — **Day 1**
2. `/feed` Live Feed — **Day 2**
3. `/events` + `/events/[id]` — **Day 3**
4. `/entities/[id]` (force graph) — **Day 4–5**
5. `/analyst` (AI chat with streaming) — **Day 5–6**
6. `/forecast` — **Day 7**
7. `/analytics` (Recharts: sentiment trend, risk score over time) — **Day 8**

#### Task 4.9: Zustand Realtime Store

```typescript
// frontend/src/store/realtime.ts
import { create } from "zustand"
import { Article, Alert } from "@/types"

interface RealtimeStore {
  liveArticles: Article[];
  activeAlerts: Alert[];
  connectionStatus: "connected" | "disconnected" | "connecting";
  addArticle: (article: Article) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
  setConnectionStatus: (status: RealtimeStore["connectionStatus"]) => void;
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  liveArticles: [],
  activeAlerts: [],
  connectionStatus: "disconnected",
  addArticle: (article) => set((state) => ({
    liveArticles: [article, ...state.liveArticles].slice(0, 200) // Cap at 200
  })),
  addAlert: (alert) => set((state) => ({
    activeAlerts: [alert, ...state.activeAlerts]
  })),
  markAlertRead: (id) => set((state) => ({
    activeAlerts: state.activeAlerts.map(a => a.id === id ? { ...a, is_read: true } : a)
  })),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}))
```

### 7.4 Phase 4 Validation Criteria

```bash
# 1. Build passes
cd frontend && npm run build
# Zero TypeScript errors. Zero.

# 2. Dashboard loads without errors
# Open http://localhost:3000
# Chrome DevTools Console: no red errors

# 3. World map renders and color-codes countries
# At least 5 countries should be non-grey (need articles with affected_regions populated)

# 4. Live feed updates in real-time
# In a separate terminal: trigger ingestion
POST http://localhost:8000/api/v2/admin/ingest
# Browser feed should show new articles within 5 seconds (WebSocket)

# 5. Entity graph renders and is interactive
# Navigate to /entities/<any id>
# Force graph renders with nodes + edges
# Clicking a node navigates to that entity's page

# 6. AI Analyst chat streams tokens
# Type a question, send
# Tokens should appear character-by-character (not all at once)
# Sources section appears below answer with clickable links

# 7. All pages load without 404 or 500
GET /
GET /feed
GET /events
GET /entities
GET /forecast
GET /analyst
GET /analytics
# All return 200 with rendered content
```

**Phase 4 Definition of Done:**
- [ ] `npm run build` passes with zero errors
- [ ] All 7 pages load without console errors
- [ ] WebSocket live feed verified working
- [ ] D3 force graph renders with 10+ nodes
- [ ] AI chat streams responses with citations
- [ ] Mobile responsive (test at 375px width in Chrome DevTools)
- [ ] Auth flow: signup → login → protected page → logout

---

## 8. Phase 5 — Production & Polish

**Duration**: 2 weeks  
**Goal**: Deployed live with CI/CD, monitoring, tests, and a README that will impress any recruiter.  
**Branch**: `v2/phase-5`

### 8.1 Observability: Prometheus + Grafana

#### Task 5.1: Prometheus Metrics

```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# These are the exact metrics that will appear in your Grafana dashboard
articles_ingested = Counter("articles_ingested_total", "Total articles ingested", ["source"])
articles_analyzed = Counter("articles_analyzed_total", "Articles AI-analyzed", ["status"])
analysis_latency = Histogram("article_analysis_seconds", "Analysis pipeline latency",
                             buckets=[0.5, 1, 2, 5, 10, 30])
groq_tokens = Counter("groq_tokens_total", "Groq tokens used", ["model", "task"])
groq_latency = Histogram("groq_call_seconds", "Groq API call latency",
                         buckets=[0.1, 0.5, 1, 2, 5])
embedding_latency = Histogram("embedding_seconds", "Ollama embedding latency")
vector_search_latency = Histogram("vector_search_seconds", "pgvector query latency",
                                  buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1])
events_detected = Counter("events_detected_total", "Events auto-detected")
rag_queries = Counter("rag_queries_total", "RAG queries executed")
redis_queue_depth = Gauge("celery_queue_depth", "Celery pending tasks", ["queue"])
```

Add to FastAPI main.py:
```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
# Metrics available at: GET /metrics
```

#### Task 5.2: Grafana Dashboards

Set up 4 dashboards (Grafana Cloud free tier):
1. **System Health**: API p50/p95 latency, error rate, CPU/memory
2. **AI Pipeline**: Articles/hour, analysis latency histogram, Groq token burn rate
3. **Platform Intelligence**: Events detected/day, entity growth, top entities by mention
4. **RAG Performance**: Queries/day, vector search latency, source diversity

### 8.2 CI/CD Pipeline

#### Task 5.3: GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, v2/dev]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r v2/backend/requirements-dev.txt
      - run: ruff check v2/backend/app/
      - run: mypy v2/backend/app/ --ignore-missing-imports
      - run: pytest v2/backend/tests/ -v --cov=v2/backend/app --cov-fail-under=70
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          REDIS_URL: redis://localhost:6379/0

  frontend-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd v2/frontend && npm ci
      - run: cd v2/frontend && npm run type-check
      - run: cd v2/frontend && npm run lint
      - run: cd v2/frontend && npm run build
```

### 8.3 Test Coverage Strategy

**Target: 70% backend coverage.** Where to focus:

```
Priority 1 — Must test (correctness-critical):
  tests/unit/test_deduplicator.py      # Hash collision edge cases
  tests/unit/test_chunker.py           # Overlap, boundary conditions
  tests/unit/test_model_router.py      # All task types route correctly
  tests/unit/test_rrf.py               # RRF score calculation
  tests/unit/test_brier_score.py       # Formula correctness

Priority 2 — Integration tests (with test DB):
  tests/integration/test_ingestion.py  # Full ingestion → DB flow
  tests/integration/test_analysis.py  # Article → analysis pipeline (mock Groq)
  tests/integration/test_rag.py        # Retrieval + generation (mock Groq)

Priority 3 — API tests:
  tests/api/test_articles.py           # CRUD + pagination
  tests/api/test_auth.py               # 401 without token, 200 with token

Skip: Agent Celery tasks (hard to test in CI without full infra)
```

**Mock Groq in tests** — never call real API in CI:
```python
# tests/conftest.py
@pytest.fixture
def mock_groq(monkeypatch):
    async def fake_chat_json(*args, **kwargs):
        return {"sentiment_label": "Negative", "score": 0.8, "reasoning": "test"}
    monkeypatch.setattr("app.ai.groq_client.GroqClient.chat_json", fake_chat_json)
```

### 8.4 Deployment

#### Task 5.4: Railway (Backend)

```bash
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "v2/backend/Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/v2/admin/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

# Deploy worker as a separate Railway service
# startCommand = "celery -A app.core.celery_app worker --concurrency=2"
```

#### Task 5.5: Vercel (Frontend)

```bash
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

### 8.5 README Requirements

The V2 README must have ALL of these — this is what recruiters see on GitHub:

```markdown
# Sections required:
1. Title + one-liner + 4 role-specific badges (AI Eng | ML Eng | Full Stack | SWE)
2. Live demo link (Vercel URL)
3. Architecture diagram (the mermaid flowchart from blueprint Section 3)
4. Tech stack table (Backend | AI Models | Frontend | Database | DevOps)
5. "Three differentiating features" section (RAG Chat, Event Detection, Forecasting)
6. Evaluation metrics table (from blueprint Section 23)
7. How to run locally: exactly 5 commands using Docker Compose
8. Project structure with one-line description per directory
9. API documentation link (Swagger UI at /docs)
10. Demo video GIF (record a 60s Loom → embed as GIF)
```

### 8.6 Phase 5 Validation Criteria

```bash
# 1. CI passes on a clean PR
git checkout -b test/ci-check
git push origin test/ci-check
# GitHub Actions: all jobs green

# 2. Production deployment health
curl https://your-app.railway.app/api/v2/admin/health
# {"status": "ok", "environment": "production"}

# 3. Frontend live
curl -I https://your-app.vercel.app
# HTTP/2 200

# 4. Test coverage
pytest v2/backend/tests/ --cov=v2/backend/app --cov-report=term-missing
# Coverage: 70%+ (anything below is a block)

# 5. Load test (basic)
pip install locust
# Run 50 concurrent users for 60s on GET /api/v2/articles
# p95 < 500ms (excluding LLM endpoints)

# 6. Grafana dashboard has real data
# Open Grafana → AI Pipeline dashboard
# articles_ingested_total > 0
# article_analysis_seconds histogram has entries
```

**Phase 5 Definition of Done:**
- [ ] CI pipeline: all jobs pass on every push
- [ ] Production backend deployed and healthy on Railway
- [ ] Frontend live on Vercel with auth working
- [ ] Test coverage ≥ 70% (enforced in CI)
- [ ] Grafana dashboard shows real metrics
- [ ] README has all 10 required sections
- [ ] Demo video recorded and linked
- [ ] V1 README updated to link to V2

---

## 9. Cross-Phase Architecture Decisions

### 9.1 Async SQLAlchemy Pattern

Use this session pattern throughout — it's the correct async SQLAlchemy 2.0 pattern:

```python
# backend/app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # Detects dead connections before using them
    echo=settings.environment == "development"
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 9.2 Error Handling Conventions

Consistent error handling across all agents and API routes:

```python
# Agents: catch exceptions, log, return structured error dict — never let agents crash
# API routes: raise HTTPException with RFC 7807 Problem Details format
# Groq calls: return {} on failure (handled by caller)
# Ollama calls: return zero vector / empty dict on failure (handled by caller)

# Never let a single article failure stop the batch
# Never let a single adapter failure stop other adapters
# Never let an embedding failure stop analysis
```

### 9.3 Structured Logging Convention

```python
# Use structlog throughout — contextual, queryable logs
logger = get_logger(__name__)

# Always bind context before logging in agents:
log = logger.bind(
    article_id=article_id,
    task_id=self.request.id if hasattr(self, 'request') else None
)
log.info("analysis_started")
log.info("analysis_complete", score=87.3, latency_ms=1240)
log.error("analysis_failed", error=str(e), will_retry=True)
```

### 9.4 Environment Variable Discipline

```
NEVER: hardcode any key, URL, or secret in source code
NEVER: commit .env files (verified by .gitignore)
ALWAYS: provide .env.example with placeholder values
ALWAYS: validate required vars at startup via Pydantic Settings
```

---

## 10. Evaluation Metrics Tracker

Track these actively — put them in your README once you have real numbers.

| Subsystem | Metric | Target | Measurement Method | Current |
|---|---|---|---|---|
| Ingestion | Articles/hour | ≥ 500 | Prometheus counter | TBD |
| Deduplication | False positive rate | < 1% | Manual audit 100 pairs | TBD |
| Sentiment | F1 vs human labels | ≥ 0.80 | Label 50 articles manually | TBD |
| Bias detection | Accuracy | ≥ 0.75 | Label 50 articles manually | TBD |
| Translation | BLEU score | ≥ 25 | vs Google Translate on 20 articles | TBD |
| Summarization | ROUGE-L | ≥ 0.35 | vs article lead paragraph | TBD |
| Event clustering | Silhouette score | ≥ 0.50 | sklearn.metrics | TBD |
| RAG retrieval | Recall@5 | ≥ 0.75 | 20 test Q&A pairs | TBD |
| RAG end-to-end | Human eval | ≥ 4.0/5 | Rate 20 Q&A pairs | TBD |
| Forecasting | Brier Score | < 0.20 | Tracked over 30+ forecasts | TBD |
| API latency | p95 (non-LLM) | < 200ms | Prometheus histogram | TBD |
| Groq calls | p95 latency | < 2s | Prometheus histogram | TBD |
| Embeddings | Per-doc latency | < 200ms | Prometheus histogram | TBD |

**When to measure**: At the end of Phase 3 (all AI components built), before Phase 4 starts.

---

## 11. Interview Prep — Talking Points Per Phase

### Phase 1 Questions

**"Why Supabase over raw PostgreSQL?"**
> Managed Postgres + pgvector + Auth + Realtime + Row-Level Security in one service. For a solo project, the 2 weeks saved on infra is better spent on AI features. Vendor lock-in is acceptable — the SQL dialect is standard PostgreSQL.

**"Why cursor-based pagination instead of offset?"**
> Offset pagination breaks on live feeds — if 5 new articles are inserted between page 1 and page 2 fetches, offset causes duplicates and gaps. Cursor pagination is stable regardless of inserts.

### Phase 2 Questions

**"Why Groq over OpenAI for the analysis pipeline?"**
> Groq runs LLMs on custom LPU hardware at 400–700 tok/s vs OpenAI's ~40–60 tok/s. For a news pipeline processing hundreds of articles, 10x throughput matters. Quality for classification/summarization tasks is comparable between Llama-70b and GPT-4o-mini.

**"Why Celery + Redis instead of Python's asyncio background tasks?"**
> `FastAPI.BackgroundTasks` runs in the uvicorn event loop — one slow task blocks all others, there's no retry logic, and tasks die if the server restarts. Celery gives: worker process isolation, persistent task queue, retry with exponential backoff, dead letter queue, horizontal scaling, and Flower monitoring UI.

### Phase 3 Questions

**"Why HDBSCAN over K-Means for event clustering?"**
> K-Means requires knowing `k` upfront — impossible for news events where you don't know how many stories exist. HDBSCAN is density-based: discovers clusters of arbitrary shape, handles noise points (articles that don't belong to any event), and requires no pre-specified cluster count. The only tradeoff is it's slower than K-Means on large datasets (O(n²) with precomputed distance matrix) — acceptable for < 5000 articles per 48-hour window.

**"Why pgvector over Pinecone/Weaviate?"**
> At college-project scale (< 500k vectors), pgvector with an HNSW index gives < 50ms vector queries — indistinguishable from dedicated vector databases. The benefit: join vectors with article metadata in a single SQL query, no separate service to maintain, and no additional cost. Pinecone/Weaviate become relevant at 100M+ vectors.

**"Explain Reciprocal Rank Fusion."**
> RRF merges ranked lists from multiple retrieval strategies without needing to normalize their scores. Formula: `score = Σ 1/(k + rank_i)` where k=60 is a smoothing constant. If an article ranks #2 in vector search and #5 in full-text search, its RRF score is `1/62 + 1/65 ≈ 0.032`. An article ranking #1 in both gets `1/61 + 1/61 ≈ 0.033`. It's parameter-free, requires no training data, and empirically outperforms weighted score combination.

### Phase 4 Questions

**"How did you handle D3 and React together?"**
> D3 and React both want to own the DOM. I gave D3 full control of a single `<svg>` element accessed via `useRef`, while React managed everything around it. The D3 visualization runs entirely inside a `useEffect` with the data as a dependency — React re-renders trigger D3 to re-draw, but D3 never touches React's virtual DOM.

**"How does your RAG streaming work?"**
> The backend uses FastAPI's `StreamingResponse` with Groq's streaming API. Each token is wrapped in Server-Sent Events format (`data: {"type":"token","content":"..."}\n\n`). The frontend reads the stream byte-by-byte via the Fetch API's `ReadableStream`, decoding each SSE event and appending tokens to React state. The "done" event includes the source article references for citations.

### Phase 5 Questions

**"What's in your Grafana dashboards?"**
> Four dashboards: (1) System Health — API latency p50/p95/p99, error rate, DB connection pool; (2) AI Pipeline — articles/hour throughput, analysis latency histogram, Groq token burn rate by model; (3) Platform Intelligence — events detected per day, entity graph growth rate, knowledge graph edge count; (4) User Activity — RAG queries per day, forecast generation rate, most-queried topics.

**"How do you prevent prompt injection in the RAG system?"**
> User input is sanitized before embedding: max 500 characters, strip/reject known injection patterns ("ignore previous", "system:", "you are now"), and all user content is placed in the `user` role — never injected into `system` prompt. Additionally, the RAG system uses temperature=0.1 and response grounding instructions that make the model resistant to following injected instructions.

---

## Quick Reference — Phase Gates

| Phase | Status | Key Deliverable | Block If Not Met |
|---|---|---|---|
| Phase 0 | ⬜ | All 4 verification commands pass | Hard block |
| Phase 1 | ⬜ | 50+ articles in Supabase, auth works, Docker up | Hard block |
| Phase 2 | ⬜ | Articles analyzed within 60s, embeddings in pgvector | Hard block |
| Phase 3 | ⬜ | Events clustered, RAG answers with citations | Hard block |
| Phase 4 | ⬜ | `npm run build` passes, all pages load | Hard block |
| Phase 5 | ⬜ | CI green, deployed live, README complete | Hard block |

**Rule**: At the end of each phase, paste the validation criteria results here. Only proceed when all checks are ✅.

---

*Roadmap version: 2.0.0 | Generated for V2 rebuild | Next step: Phase 0*
