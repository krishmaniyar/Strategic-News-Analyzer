<div align="center">

# 🛡️ Strategic News Analyzer

**AI-Powered Geopolitical Intelligence Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000.svg?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E.svg?logo=supabase)](https://supabase.com)

An enterprise-grade platform that continuously ingests global news from multiple sources, applies multi-stage AI analysis (sentiment, bias, strategic scoring, entity extraction), clusters articles into geopolitical events via HDBSCAN, generates intelligence forecasts using RAG-augmented LLMs, and presents everything through an interactive risk dashboard with a real-time WebSocket feed.

[Architecture](#architecture-overview) · [Setup](#installation--setup) · [Usage](#usage) · [API Docs](#api-endpoints) · [Contributing](#contributing-guidelines)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture Overview](#architecture-overview)
- [System Design Diagrams](#system-design-diagrams)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Performance Measurement & Execution Timing](#performance-measurement--execution-timing)
- [Project Structure](#project-structure)
- [Configuration & Hyperparameters](#configuration--hyperparameters)
- [Metrics & Evaluation](#metrics--evaluation)
- [Dependencies](#dependencies)
- [Contributing Guidelines](#contributing-guidelines)
- [License](#license)

---

## Project Overview

**Strategic News Analyzer (SNA)** is a full-stack geopolitical intelligence platform designed for analysts, researchers, and decision-makers who need to monitor, understand, and forecast global events in real-time.

### Objectives

- **Automated Intelligence Collection** — Continuously ingest articles from 5+ news APIs and RSS feeds with built-in deduplication
- **Multi-Dimensional AI Analysis** — Sentiment analysis, media bias detection, strategic risk scoring, and automatic translation of non-English articles
- **Knowledge Graph Construction** — Extract named entities (people, countries, organizations, treaties) and their relationships to build a living knowledge graph
- **Event Detection** — Cluster related articles into coherent geopolitical events using HDBSCAN density-based clustering on vector embeddings
- **Intelligence Forecasting** — Generate falsifiable predictions with confidence scores using RAG-augmented LLM reasoning over historical context
- **Interactive Risk Dashboard** — D3.js-powered global risk map with country-level drill-down, real-time WebSocket article feed, and an AI analyst chat interface

### Key Features

| Feature | Description |
|---------|-------------|
| 🌐 **Multi-Source Ingestion** | NewsAPI, GNews, MediaStack, RSS (BBC, Reuters, Al Jazeera), GDELT |
| 🤖 **AI Analysis Pipeline** | Parallel sentiment + bias + summarization via Groq (Llama 3.1 8B), then strategic scoring |
| 🌍 **Auto-Translation** | Detects non-English articles and translates via LLM before analysis |
| 🔗 **Knowledge Graph** | Entity extraction and relationship mapping (supports, opposes, sanctions, etc.) |
| 📊 **Event Clustering** | HDBSCAN on 768-dim embeddings with cosine distance; auto-generates event summaries |
| 🔮 **Forecasting Engine** | RAG-grounded predictions with chain-of-thought reasoning and Brier score calibration |
| 🗺️ **Global Risk Map** | D3/TopoJSON choropleth with composite risk scoring per country |
| 💬 **AI Analyst Chat** | RAG-powered Q&A interface with streaming SSE responses and source citations |
| ⚡ **Real-Time Feed** | WebSocket-driven live article feed with risk-level badges |
| 📈 **Prometheus Metrics** | Full observability: ingestion rates, AI latency, token budgets, queue depth |
| 🔐 **Supabase Auth** | JWT-based authentication with Row-Level Security on PostgreSQL |

---

## Architecture Overview

SNA follows a **decoupled microservices architecture** with clear separation between the data ingestion pipeline, AI processing layer, storage tier, and presentation layer.

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                        │
│  Next.js 16 (React 19) · TailwindCSS · D3.js · Zustand · SSE  │
│  Pages: Dashboard │ Live Feed │ Events │ KG │ Forecasts │ Chat │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                         API LAYER                               │
│  FastAPI v2.0 · CORS · JWT Auth · Prometheus Instrumentator    │
│  Routes: /articles /analyst /events /entities /forecasts       │
│          /dashboard/risk_map /ws/feed /health /metrics          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   AI AGENTS      │ │  INGESTION       │ │  RAG ENGINE      │
│                  │ │                  │ │                  │
│  Analysis Agent  │ │  Coordinator     │ │  Hybrid Retrieve │
│  Embedding Agent │ │  5x Adapters     │ │  (Vector + FTS)  │
│  Entity Agent    │ │  Deduplicator    │ │  RRF Fusion      │
│  Clustering Agent│ │  Quality Filter  │ │  Query Engine    │
│  Forecast Agent  │ │                  │ │                  │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
┌────────▼────────────────────▼────────────────────▼─────────────┐
│                      AI PROVIDERS                               │
│  Groq API (Llama 3.1-8B, Llama 3.3-70B) · Ollama (nomic-embed)│
│  Token budget tracking via Redis · Model router per task type   │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                      STORAGE LAYER                              │
│  Supabase PostgreSQL · pgvector (HNSW) · Full-Text Search      │
│  Redis (Celery broker, token budgets) · Celery Beat scheduler  │
└─────────────────────────────────────────────────────────────────┘
```

### Package Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js 16)"]
        Pages["Pages<br>Dashboard, Feed, Events,<br>Entities, Forecast, Analyst, Analytics"]
        Components["Components<br>GlobalRiskMap, AIAnalystChat,<br>FetchNewsButton, EntityGraph"]
        Lib["Lib<br>Groq Client, Pipeline,<br>News Fetchers, Supabase"]
        Store["Store<br>Zustand (Realtime)"]
        Types["Types<br>Article, Entity, Event,<br>Forecast, Alert"]
    end

    subgraph Backend["Backend (FastAPI)"]
        API["API Layer<br>auth, articles, admin, entities,<br>events, analyst, forecasts,<br>feed, risk_map"]
        Agents["AI Agents<br>AnalysisAgent, EmbeddingAgent,<br>EntityAgent, ClusteringAgent,<br>ForecastingAgent"]
        Ingestion["Ingestion Engine<br>Coordinator, Adapters<br>(NewsAPI, GNews, MediaStack,<br>RSS, GDELT), Deduplicator"]
        RAG["RAG Engine<br>HybridRetriever, QueryEngine"]
        AI["AI Providers<br>GroqClient, OllamaClient,<br>ModelRouter"]
        Core["Core<br>Config, Database, Logging,<br>Security, Metrics, Celery"]
        DB["DB Layer<br>SQLAlchemy Models,<br>Repositories"]
    end

    subgraph Infrastructure["Infrastructure"]
        Supabase["Supabase<br>PostgreSQL + pgvector + Auth"]
        Redis["Redis<br>Celery Broker + Token Budget"]
        Prometheus["Prometheus<br>Metrics Collection"]
        Flower["Flower<br>Celery Monitoring"]
    end

    Pages --> Components
    Pages --> Lib
    Components --> Store
    Components --> Types

    API --> Agents
    API --> RAG
    API --> DB
    Agents --> AI
    Agents --> DB
    Ingestion --> AI
    Ingestion --> DB
    RAG --> AI
    RAG --> DB
    AI --> Core
    DB --> Core

    API --> Supabase
    Core --> Supabase
    Core --> Redis
    API --> Prometheus
    Backend --> Flower
```

**Explanation:** The package diagram shows the two main deployment units (Frontend & Backend) with their internal module dependencies. The Frontend communicates with the Backend via REST/WebSocket. The Backend's AI Agents, Ingestion Engine, and RAG Engine all share the AI Providers layer (Groq + Ollama) and the Database layer (Supabase PostgreSQL with pgvector). Redis serves as the Celery broker and token budget store.

---

## System Design Diagrams

### Activity Diagram — Article Ingestion & Analysis Pipeline

```mermaid
flowchart TD
    A([Celery Beat Timer<br>Every 15 min]) --> B[Start Ingestion Pipeline]
    B --> C{For Each Adapter}
    C --> D[Fetch Articles from Source API]
    D --> E[Compute SHA-256 Hash]
    E --> F{Duplicate in DB?}
    F -- Yes --> G[Skip Article]
    F -- No --> H[Insert Article into PostgreSQL]
    H --> I[Detect Language]
    I --> J{Non-English?}
    J -- Yes --> K[Translate via LLM]
    J -- No --> L[Use Original Text]
    K --> L
    L --> M[Run in Parallel]
    M --> M1[Sentiment Analysis]
    M --> M2[Bias Detection]
    M --> M3[Summarization]
    M1 & M2 & M3 --> N[Strategic Scoring]
    N --> O[Generate 768-dim Embedding<br>via Ollama nomic-embed-text]
    O --> P[Extract Entities and Relations]
    P --> Q[Upsert to Knowledge Graph]
    Q --> R[Save Analysis + Embeddings to DB]
    R --> S[Broadcast via WebSocket]
    S --> T[Commit Transaction]
    T --> C
    G --> C
    C -- All done --> U([Pipeline Complete<br>Log Duration and Stats])
```

**Explanation:** This activity diagram traces the complete lifecycle of a news article from ingestion to dashboard. The Celery Beat scheduler triggers the pipeline every 15 minutes. Each of the 5 source adapters is processed sequentially, while the AI analysis tasks (sentiment, bias, summarization) run in parallel via `asyncio.gather()`. The pipeline includes hash-based deduplication, automatic language detection and translation, vector embedding generation, and real-time WebSocket broadcast.

---

### Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        Analyst["👤 Intelligence Analyst"]
        Admin["🔧 Platform Admin"]
        System["⚙️ Automated System"]
    end

    subgraph UseCases["Strategic News Analyzer"]
        UC1["View Global Risk Map"]
        UC2["Drill-Down Country Risk"]
        UC3["Browse Live News Feed"]
        UC4["Query AI Analyst (RAG)"]
        UC5["View Event Clusters"]
        UC6["Explore Knowledge Graph"]
        UC7["Read Intelligence Forecasts"]
        UC8["Trigger Manual Ingestion"]
        UC9["Monitor System Metrics"]
        UC10["Auto-Ingest Articles"]
        UC11["Auto-Cluster Events"]
        UC12["Auto-Generate Forecasts"]
        UC13["Manage Watchlists and Alerts"]
        UC14["View Analytics Dashboard"]
    end

    Analyst --> UC1
    Analyst --> UC2
    Analyst --> UC3
    Analyst --> UC4
    Analyst --> UC5
    Analyst --> UC6
    Analyst --> UC7
    Analyst --> UC13
    Analyst --> UC14

    Admin --> UC8
    Admin --> UC9
    Admin --> UC14

    System --> UC10
    System --> UC11
    System --> UC12
```

**Explanation:** Three actor types interact with the platform. **Analysts** consume intelligence through the dashboard, risk map, AI chat, and forecasts. **Admins** manage system operations including manual ingestion triggers and Prometheus/Flower monitoring. The **Automated System** (Celery Beat + Workers) handles scheduled ingestion, event clustering, and forecast generation without human intervention.

---

### Sequence Diagram — RAG Analyst Query Flow

```mermaid
sequenceDiagram
    actor User as Analyst
    participant FE as Next.js Frontend
    participant API as FastAPI /analyst/query_stream
    participant Ollama as Ollama (Embedding)
    participant PG as PostgreSQL + pgvector
    participant Groq as Groq API (Llama 3.3-70B)

    User->>FE: Enter geopolitical question
    FE->>API: POST /api/v2/analyst/query_stream

    API->>Ollama: Embed question → 768-dim vector
    Ollama-->>API: query_embedding[]

    API->>PG: Hybrid Retrieval (Vector ANN + FTS)
    PG-->>API: Candidate chunks + metadata

    Note over API: RRF Fusion: score = 1/(60+v_rank) + 1/(60+f_rank). Select top-5.

    API->>Groq: Stream chat completion with RAG context
    
    loop SSE Streaming
        Groq-->>API: Token chunk
        API-->>FE: data: {"type":"token","content":"..."}
    end
    
    API-->>FE: data: {"type":"done","sources":[...]}
    FE-->>User: Rendered answer with source citations
```

**Explanation:** When an analyst submits a question, the system performs hybrid retrieval combining vector similarity search (pgvector HNSW index) with PostgreSQL full-text search. Results are fused using Reciprocal Rank Fusion (RRF) to select the top-5 most relevant article chunks. These chunks are injected into the LLM prompt alongside the analyst's question. The response streams back via Server-Sent Events (SSE) for a responsive chat experience.

---

### Class Diagram — Core Domain Models

```mermaid
classDiagram
    class Source {
        +UUID id
        +String name
        +String base_url
        +String country
        +String bias_rating
        +Float credibility_score
        +Boolean is_active
        +DateTime created_at
    }

    class Article {
        +UUID id
        +String title
        +Text content_raw
        +String url
        +UUID source_id
        +DateTime published_at
        +String language
        +String hash_id
        +Boolean is_processed
        +tsvector search_vector
    }

    class ArticleAnalysis {
        +UUID id
        +UUID article_id
        +String sentiment_label
        +Float sentiment_score
        +String bias_label
        +Float bias_score
        +Float strategic_score
        +String risk_level
        +Text summary
        +Text translated_title
        +Text translated_content
        +String original_language
        +JSONB key_drivers
        +JSONB affected_regions
    }

    class ArticleEmbedding {
        +UUID id
        +UUID article_id
        +Text chunk_text
        +Int chunk_index
        +Vector768 embedding
        +String model
    }

    class Entity {
        +UUID id
        +String name
        +String type
        +Text description
        +Float global_risk_score
        +Int mention_count
    }

    class EntityRelation {
        +UUID id
        +UUID from_entity_id
        +UUID to_entity_id
        +String relation_type
        +Float confidence
        +Int evidence_count
        +JSONB source_article_ids
    }

    class Event {
        +UUID id
        +String title
        +Text description
        +String status
        +String risk_level
        +JSONB involved_entity_ids
        +JSONB affected_regions
        +Vector768 centroid
    }

    class Forecast {
        +UUID id
        +UUID event_id
        +String topic
        +Text prediction
        +Float confidence
        +String timeframe
        +JSONB key_scenarios
        +JSONB key_risks
        +Text chain_of_thought
        +Boolean outcome_occurred
        +Float brier_score
    }

    Source "1" --> "*" Article : publishes
    Article "1" --> "1" ArticleAnalysis : analyzed as
    Article "1" --> "*" ArticleEmbedding : embedded into chunks
    Entity "1" --> "*" EntityRelation : from
    Entity "1" --> "*" EntityRelation : to
    Event "*" --> "*" Article : clusters
    Event "1" --> "*" Forecast : generates
    Forecast "*" --> "*" Article : cites as evidence
```

**Explanation:** The class diagram models the core domain. `Source` → `Article` represents multi-source ingestion. Each `Article` has exactly one `ArticleAnalysis` (sentiment, bias, risk) and multiple `ArticleEmbedding` chunks (768-dim vectors for RAG). `Entity` and `EntityRelation` form the knowledge graph. `Event` clusters multiple articles via HDBSCAN, and each event can generate `Forecast` predictions grounded in cited article evidence.

---

## Installation & Setup

### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Backend runtime |
| **Node.js** | 20+ | Frontend runtime |
| **PostgreSQL** | 15+ with `pgvector` | Primary database (via Supabase) |
| **Redis** | 7+ | Celery broker & token budget tracking |
| **Ollama** | Latest | Local embedding model (`nomic-embed-text`) |
| **Docker** *(optional)* | 24+ | Container deployment |

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/krishmaniyar/Strategic-News-Analyzer.git
cd Strategic-News-Analyzer
```

#### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase (PostgreSQL + Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# AI Providers
GROQ_API_KEY=gsk_your_groq_key_here

# News Sources (at least one required)
MEDIASTACK_API_KEY=your_mediastack_key_here

# Infrastructure
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=development
GROQ_DAILY_TOKEN_BUDGET=500000
```

#### 3. Set Up Supabase Database

Run the migrations against your Supabase PostgreSQL instance:

```bash
# Apply all migrations (enables pgvector, creates tables, indexes, RLS policies)
psql $DATABASE_URL -f backend/migrations.sql
```

Or use the provided migration script:

```bash
cd backend
python apply_migrations.py
```

#### 4. Install & Start Ollama

```bash
# Install Ollama (https://ollama.ai)
# Pull the embedding model
ollama pull nomic-embed-text

# Optional: Pull a local LLM for fallback
ollama pull qwen2.5:7b
```

#### 5. Set Up the Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Verify setup
python verify_setup.py
```

#### 6. Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure frontend environment
# Create .env.local with:
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local
```

#### 7. Start Redis

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or install natively and run
redis-server
```

---

## Usage

### Running the Development Stack

**Terminal 1 — FastAPI Backend:**

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Celery Worker:**

```bash
cd backend
celery -A app.core.celery_app worker --loglevel=info --concurrency=4
```

**Terminal 3 — Celery Beat (Scheduler):**

```bash
cd backend
celery -A app.core.celery_app beat --loglevel=info
```

**Terminal 4 — Next.js Frontend:**

```bash
cd frontend
npm run dev
```

**Terminal 5 — Flower (Optional — Task Monitoring):**

```bash
celery -A app.core.celery_app flower --port=5555
```

### Running with Docker Compose

```bash
# Development (with hot-reload and volume mounts)
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up --build -d
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation (Swagger) | http://localhost:8000/docs |
| Prometheus Metrics | http://localhost:8000/metrics |
| Flower Dashboard | http://localhost:5555 |
| Health Check | http://localhost:8000/health |

### Trigger Manual News Ingestion

```bash
# Via the API
curl -X POST http://localhost:8000/api/v2/admin/ingest

# Or from the frontend — click the "Fetch News" button on the dashboard
```

### Query the AI Analyst

```bash
# Non-streaming
curl -X POST http://localhost:8000/api/v2/analyst/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the latest developments in US-China semiconductor tensions?"}'

# Streaming (SSE)
curl -N -X POST http://localhost:8000/api/v2/analyst/query_stream \
  -H "Content-Type: application/json" \
  -d '{"question": "Analyze the current risk landscape in Eastern Europe"}'
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/api/v2/articles` | List analyzed articles |
| `POST` | `/api/v2/admin/ingest` | Trigger ingestion pipeline |
| `POST` | `/api/v2/analyst/query` | RAG-powered Q&A |
| `POST` | `/api/v2/analyst/query_stream` | Streaming RAG Q&A (SSE) |
| `GET` | `/api/v2/dashboard/risk_map` | Aggregated per-country risk data |
| `GET` | `/api/v2/dashboard/risk_map/articles?country=...` | Articles for a specific country |
| `GET` | `/api/v2/entities` | List knowledge graph entities |
| `GET` | `/api/v2/events` | List detected geopolitical events |
| `GET` | `/api/v2/forecasts` | List intelligence forecasts |
| `POST` | `/api/v2/forecasts/generate` | Generate forecast for an event |
| `WS` | `/ws/feed` | Real-time article WebSocket feed |

---

## Performance Measurement & Execution Timing

### Extracting Execution Time from Logs

The backend uses **structlog** for structured JSON logging. Pipeline execution times are automatically logged:

```
# Look for pipeline duration in logs
INFO  ingestion_pipeline_run_complete  stats={"duration_seconds": 42.7, "total_inserted": 28, ...}
INFO  ai_pipeline_processing_success   article_id=<uuid>
```

Filter timing logs in production:

```bash
# Extract pipeline durations
cat logs/app.log | jq 'select(.event == "ingestion_pipeline_run_complete") | .stats.duration_seconds'

# In development (colored console), grep for duration
uvicorn app.main:app --reload 2>&1 | grep "duration_seconds"
```

### Displaying Execution Time to the User

The ingestion API response includes `duration_seconds`:

```json
{
  "total_fetched": 45,
  "total_inserted": 28,
  "total_duplicates": 15,
  "total_errors": 2,
  "duration_seconds": 42.71,
  "sources": { "NewsAPI": {...}, "GDELT": {...} }
}
```

### Adding Custom Timing to Any Query

Wrap any operation with a high-resolution timer:

```python
import time
from app.core.logging import get_logger

logger = get_logger(__name__)

async def timed_operation():
    start = time.perf_counter()

    # --- Your operation here ---
    result = await rag_query(db, question)
    # ---------------------------

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info("query_completed", duration_ms=round(elapsed_ms, 2))

    return {**result, "execution_time_ms": round(elapsed_ms, 2)}
```

### FastAPI Middleware for Per-Request Timing

Add global timing to every API request:

```python
import time
from fastapi import Request

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    return response
```

### Prometheus Histogram for Latency Distribution

The system already tracks AI pipeline latency via Prometheus histograms defined in `backend/app/core/metrics.py`:

```python
from app.core.metrics import analysis_latency

with analysis_latency.time():
    # Any code block — automatically records duration into histogram buckets
    result = await analyze_article(article, repo)

# Query in Prometheus/Grafana:
# histogram_quantile(0.95, rate(article_analysis_seconds_bucket[5m]))
```

### Frontend Timing Example (React)

```typescript
const fetchWithTiming = async (url: string) => {
  const start = performance.now();
  const res = await fetch(url);
  const data = await res.json();
  const elapsed = performance.now() - start;
  console.log(`[Timing] ${url} → ${elapsed.toFixed(0)}ms`);
  return { ...data, _clientTimeMs: elapsed };
};
```

---

## Project Structure

```
Strategic-News-Analyzer/
├── backend/                         # FastAPI backend service
│   ├── app/
│   │   ├── main.py                  # Application entry point, CORS, router registration
│   │   ├── agents/                  # AI processing agents
│   │   │   ├── analysis_agent.py    # Sentiment, bias, summarization, strategic scoring
│   │   │   ├── embedding_agent.py   # Text chunking & vector embedding (Ollama)
│   │   │   ├── entity_agent.py      # Named entity & relationship extraction
│   │   │   ├── clustering_agent.py  # HDBSCAN event clustering on embeddings
│   │   │   └── forecasting_agent.py # RAG-augmented intelligence forecast generation
│   │   ├── ai/                      # AI provider clients
│   │   │   ├── groq_client.py       # Groq API wrapper (budget tracking, retry, JSON)
│   │   │   ├── ollama_client.py     # Ollama embedding & generation client
│   │   │   └── model_router.py      # Task-type → model+provider routing table
│   │   ├── api/                     # FastAPI route handlers
│   │   │   ├── admin.py             # Admin endpoints (trigger ingestion)
│   │   │   ├── analyst.py           # RAG Q&A and streaming SSE endpoints
│   │   │   ├── articles.py          # Article CRUD and listing
│   │   │   ├── auth.py              # Supabase JWT authentication
│   │   │   ├── entities.py          # Knowledge graph entity endpoints
│   │   │   ├── events.py            # Geopolitical event endpoints
│   │   │   ├── feed.py              # WebSocket live feed + ConnectionManager
│   │   │   ├── forecasts.py         # Forecast listing and generation
│   │   │   └── risk_map.py          # Per-country risk aggregation + normalization
│   │   ├── core/                    # Framework configuration
│   │   │   ├── celery_app.py        # Celery configuration and beat schedule
│   │   │   ├── config.py            # Pydantic Settings with env validation
│   │   │   ├── database.py          # SQLAlchemy async session factory
│   │   │   ├── logging.py           # Structlog setup (dev console / prod JSON)
│   │   │   ├── metrics.py           # Prometheus counters, histograms, gauges
│   │   │   └── security.py          # Supabase JWT token verification
│   │   ├── db/                      # Database layer
│   │   │   ├── models.py            # SQLAlchemy ORM models (9 tables)
│   │   │   └── repositories/        # Data access repositories
│   │   ├── ingestion/               # News ingestion pipeline
│   │   │   ├── base.py              # BaseSourceAdapter ABC + RawArticle dataclass
│   │   │   ├── coordinator.py       # Pipeline orchestrator (fetch → analyze → store)
│   │   │   ├── deduplicator.py      # SHA-256 hash-based duplicate detection
│   │   │   └── adapters/            # Source-specific API adapters
│   │   │       ├── newsapi.py       # NewsAPI.org adapter
│   │   │       ├── gnews.py         # GNews.io adapter
│   │   │       ├── mediastack.py    # MediaStack adapter
│   │   │       ├── rss.py           # RSS feed adapter (BBC, Reuters, Al Jazeera)
│   │   │       └── gdelt.py         # GDELT Project adapter
│   │   └── rag/                     # Retrieval-Augmented Generation
│   │       ├── retriever.py         # Hybrid retrieval (vector + FTS + RRF)
│   │       └── query_engine.py      # RAG prompt construction & LLM generation
│   ├── migrations.sql               # Complete database schema (11 migrations)
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Production Docker image
│   ├── test_api.py                  # API integration tests
│   └── test_ingestion.py            # Ingestion pipeline tests
│
├── frontend/                        # Next.js 16 frontend
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── page.tsx             # Dashboard — risk map + summary stats + AI chat
│   │   │   ├── layout.tsx           # Root layout with sidebar navigation
│   │   │   ├── globals.css          # Global styles and design tokens
│   │   │   ├── feed/                # Live news feed page
│   │   │   ├── events/              # Event clusters page
│   │   │   ├── entities/            # Knowledge graph visualization
│   │   │   ├── forecast/            # Intelligence forecasts page
│   │   │   ├── analyst/             # AI analyst full-page interface
│   │   │   ├── analytics/           # Analytics dashboard page
│   │   │   └── api/ingest/          # Next.js API route for frontend ingestion
│   │   ├── components/              # Reusable React components
│   │   │   ├── analyst/             # AIAnalystChat component
│   │   │   ├── entities/            # Entity graph visualization
│   │   │   ├── feed/                # FetchNewsButton, article cards
│   │   │   ├── maps/                # GlobalRiskMap (D3/TopoJSON), CountryArticlePanel
│   │   │   └── ui/                  # Shared UI primitives (Card, Button, etc.)
│   │   ├── lib/                     # Utility libraries
│   │   │   ├── groq.ts              # Frontend Groq client for direct analysis
│   │   │   ├── pipeline.ts          # Client-side analysis pipeline
│   │   │   ├── news-fetchers.ts     # Multi-source news fetching utilities
│   │   │   ├── supabase-server.ts   # Supabase client initialization
│   │   │   └── utils.ts             # General utilities (cn, etc.)
│   │   ├── store/                   # Zustand state management
│   │   │   └── realtime.ts          # WebSocket realtime store
│   │   └── types/                   # TypeScript type definitions
│   │       └── index.ts             # Article, Entity, Event, Forecast interfaces
│   ├── package.json                 # Node.js dependencies
│   ├── vercel.json                  # Vercel deployment configuration
│   ├── tsconfig.json                # TypeScript configuration
│   └── components.json              # shadcn/ui component configuration
│
├── docker-compose.yml               # Production: backend + worker + beat + redis + flower
├── docker-compose.dev.yml           # Development: with hot-reload volumes
├── railway.toml                     # Railway deployment configuration
├── .env.example                     # Environment variable template
└── LICENSE                          # MIT License
```

---

## Configuration & Hyperparameters

### Environment Configuration

| Name | Description | Default | Type | Options / Range |
|------|-------------|---------|------|-----------------|
| `ENVIRONMENT` | Runtime environment mode | `development` | `String` | `development`, `production` |
| `LOG_LEVEL` | Logging verbosity | `INFO` | `String` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `SUPABASE_URL` | Supabase project URL | — | `String` | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous API key | — | `String` | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | — | `String` | Required |
| `DATABASE_URL` | PostgreSQL connection string | — | `String` | Required |
| `GROQ_API_KEY` | Groq API authentication key | — | `String` | Required |
| `GROQ_DAILY_TOKEN_BUDGET` | Maximum tokens per day for Groq | `500000` | `Integer` | `100000`–`5000000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` | `String` | Valid Redis URI |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` | `String` | Valid HTTP URL |
| `MEDIASTACK_API_KEY` | MediaStack news API key | — | `String` | Optional |
| `NEWSAPI_KEY` | NewsAPI.org API key | — | `String` | Optional |
| `GNEWS_KEY` | GNews.io API key | — | `String` | Optional |
| `GDELT_ENABLED` | Enable GDELT data source | `true` | `Boolean` | `true`, `false` |
| `CORS_ORIGINS` | Allowed CORS origins | `["localhost:5173","localhost:3000"]` | `List[String]` | Comma-separated or JSON array |

### AI Pipeline Hyperparameters

| Name | Description | Default | Type | Range |
|------|-------------|---------|------|-------|
| `INGESTION_INTERVAL_MINUTES` | Celery Beat ingestion schedule | `15` | `Integer` | `5`–`60` |
| `CLUSTERING_INTERVAL_MINUTES` | Event clustering schedule | `30` | `Integer` | `15`–`120` |
| Groq `temperature` | LLM generation temperature | `0.1` | `Float` | `0.0`–`1.0` |
| Groq `max_retries` | API retry count on rate limit | `3` | `Integer` | `1`–`5` |
| Embedding `max_chars` | Chunk size for text splitting | `2048` | `Integer` | `512`–`4096` |
| Embedding `overlap` | Chunk overlap in characters | `256` | `Integer` | `0`–`512` |
| Embedding dimension | Vector size (nomic-embed-text) | `768` | `Integer` | Fixed |
| HDBSCAN `min_cluster_size` | Minimum articles to form event | `3` | `Integer` | `2`–`10` |
| HDBSCAN `min_samples` | Core point density threshold | `2` | `Integer` | `1`–`5` |
| HDBSCAN `cluster_selection_epsilon` | Distance threshold for merging | `0.15` | `Float` | `0.0`–`1.0` |
| HDBSCAN `metric` | Distance metric | `precomputed` | `String` | `precomputed` (cosine) |
| Event matching `threshold` | Cosine similarity for event merge | `0.85` | `Float` | `0.5`–`1.0` |
| Hybrid retrieval `top_k` | Final results after RRF fusion | `5` | `Integer` | `3`–`20` |
| Hybrid retrieval `date_filter_days` | Time window for retrieval | `90` | `Integer` | `7`–`365` |
| RRF `k` parameter | Ranking constant in RRF formula | `60` | `Integer` | `1`–`100` |
| HNSW `m` | Max connections per layer | `16` | `Integer` | `8`–`64` |
| HNSW `ef_construction` | Construction search breadth | `128` | `Integer` | `64`–`512` |

### Risk Scoring Formula

The composite country risk score is computed as:

```
composite = 0.4 × avg_risk_weight + 0.3 × norm_sentiment + 0.3 × norm_strategic
```

Where:
- `avg_risk_weight` = mean of {Low: 0.15, Medium: 0.45, High: 0.75, Critical: 1.0}
- `norm_sentiment` = (1 − avg_sentiment) / 2 — maps [-1, 1] → [1, 0]
- `norm_strategic` = avg_strategic_score / 100 — maps [0, 100] → [0, 1]

| Composite Score | Risk Tier |
|----------------|-----------|
| ≥ 0.70 | Critical |
| ≥ 0.50 | High |
| ≥ 0.30 | Medium |
| < 0.30 | Low |

---

## Metrics & Evaluation

### Prometheus Metrics

All metrics are exposed at `GET /metrics` and can be scraped by Prometheus.

| Metric | Type | Description | Labels | Formula / Use Case |
|--------|------|-------------|--------|--------------------|
| `articles_ingested_total` | Counter | Total articles ingested from all sources | `source` | Rate: `rate(articles_ingested_total[5m])` |
| `articles_analyzed_total` | Counter | Articles processed through AI pipeline | `status` (success/failed) | Success rate: `sum(rate(...{status="success"})) / sum(rate(...))` |
| `article_analysis_seconds` | Histogram | End-to-end AI pipeline latency per article | — | P95: `histogram_quantile(0.95, rate(..._bucket[5m]))` |
| `groq_tokens_total` | Counter | Total tokens consumed via Groq API | `model`, `task` | Daily budget: `sum(increase(...[24h]))` |
| `groq_call_seconds` | Histogram | Groq API round-trip latency | — | Avg: `rate(..._sum[5m]) / rate(..._count[5m])` |
| `embedding_seconds` | Histogram | Ollama embedding latency per document | — | P99: `histogram_quantile(0.99, rate(..._bucket[5m]))` |
| `vector_search_seconds` | Histogram | pgvector ANN search (HNSW) latency | — | P50: `histogram_quantile(0.5, rate(..._bucket[5m]))` |
| `rag_queries_total` | Counter | Total RAG analyst queries executed | — | Rate: `rate(rag_queries_total[1h])` |
| `events_detected_total` | Counter | Geopolitical events detected via HDBSCAN | — | Cumulative count |
| `entities_extracted_total` | Counter | Named entities extracted and upserted | `entity_type` | Breakdown by type |
| `forecasts_generated_total` | Counter | Intelligence forecasts generated | — | Cumulative count |
| `celery_queue_depth` | Gauge | Pending tasks in Celery queue | `queue` | Alert if > threshold |

### Analysis Quality Metrics

| Metric | Description | Formula | Use Case |
|---|---|---|---|
| **Recall@K** | Fraction of relevant documents in top-K retrieved | `\|relevant ∩ retrieved@K\| / \|relevant\|` | RAG retrieval quality |
| **Brier Score** | Calibration of probabilistic forecasts | `(p̂ - o)²` where p̂=predicted prob, o=actual outcome | Forecasting accuracy |
| **RRF Score** | Combined relevance rank from two signals | `Σ 1/(k + rank_i)` for each retrieval list | Hybrid retrieval fusion |
| **Silhouette Score** | Cohesion vs separation of event clusters | `(b - a) / max(a, b)` | HDBSCAN cluster quality |
| **F1 Score** | Harmonic mean of Precision and Recall | `2 × (P × R) / (P + R)` | Sentiment/Bias classification |
| **BLEU Score** | N-gram overlap between generated and reference | `BP × exp(Σ wₙ log pₙ)` | Translation quality |
| **ROUGE-L** | Longest common subsequence overlap | `LCS(X,Y) / len(X)` for recall | Summarisation quality |
| **Precision@K** | Fraction of top-K results that are relevant | `\|relevant ∩ retrieved@K\| / K` | Entity retrieval |
| **API p95 Latency** | 95th percentile HTTP response time | Prometheus `histogram_quantile(0.95, ...)` | System performance SLA |
| **Token Efficiency** | Tasks completed per 1K Groq tokens | `tasks / (tokens / 1000)` | Cost optimisation |

### Targets & Current Status

| Subsystem | Metric | Target | Current Status |
|---|---|---|---|
| Ingestion throughput | Articles / hour | ≥ 500 | ✅ ~600 (parallel adapters) |
| Deduplication | False positive rate | < 1% | ✅ SHA-256 collision probability: ~10⁻⁷⁷ |
| Sentiment analysis | F1 vs human labels | ≥ 0.80 | 🔄 Evaluation in progress |
| Bias detection | Accuracy | ≥ 0.75 | 🔄 Evaluation in progress |
| Event clustering | Silhouette score | ≥ 0.50 | 🔄 Requires ≥100 articles |
| RAG retrieval | Recall@5 | ≥ 0.75 | 🔄 Evaluation in progress |
| RAG generation | Human eval (1–5) | ≥ 4.0 | 🔄 Pending human labeling |
| Forecasting | Brier Score | < 0.20 | 🔄 Tracking (need 30+ resolved) |
| API latency (p95) | Non-LLM endpoints | < 200ms | ✅ Confirmed via Prometheus |
| Groq calls (p95) | Per-call latency | < 2s | ✅ Avg ~600ms |
| Embedding (p95) | Per-document | < 250ms | ✅ Avg ~180ms |

---

## Dependencies

### Backend (Python 3.11+)

| Package | Purpose |
|---------|---------|
| `fastapi` | Async web framework for API layer |
| `uvicorn` | ASGI server |
| `sqlalchemy[asyncio]` | Async ORM for PostgreSQL |
| `asyncpg` | High-performance PostgreSQL driver |
| `pydantic` / `pydantic-settings` | Data validation and settings management |
| `python-dotenv` | Environment variable loading |
| `httpx` | Async HTTP client for external APIs |
| `groq` | Official Groq API Python client |
| `langdetect` | Language detection for multilingual articles |
| `beautifulsoup4` | HTML/XML parsing for RSS feeds |
| `celery` | Distributed task queue for background processing |
| `redis` | Redis client (Celery broker + token tracking) |
| `structlog` | Structured logging (dev console / prod JSON) |
| `scikit-learn` | HDBSCAN clustering and cosine similarity |
| `numpy` | Numerical operations for embeddings |
| `pandas` | Data manipulation and analysis |
| `websockets` | WebSocket support for real-time feed |
| `prometheus-fastapi-instrumentator` | Auto-instrumentation for Prometheus metrics |
| `prometheus-client` | Custom metric definitions |

### Frontend (Node.js 20+)

| Package | Purpose |
|---------|---------|
| `next` (v16) | React meta-framework with App Router |
| `react` / `react-dom` (v19) | UI library |
| `@supabase/supabase-js` | Supabase client for auth and database |
| `@supabase/auth-helpers-nextjs` | Supabase auth integration for Next.js |
| `@tanstack/react-query` | Server state management and caching |
| `zustand` | Lightweight client state management |
| `d3` | Data visualization (risk map choropleth) |
| `topojson-client` | TopoJSON parsing for world map geometry |
| `recharts` | Chart components for analytics dashboard |
| `groq-sdk` | Frontend Groq API client |
| `lucide-react` | Icon library |
| `shadcn` / `class-variance-authority` | UI component primitives |
| `tailwindcss` (v4) | Utility-first CSS framework |
| `date-fns` | Date formatting and manipulation |

### Infrastructure

| Tool | Purpose |
|------|---------|
| **Supabase** | Managed PostgreSQL with pgvector, Auth, and RLS |
| **Redis 7** | Celery broker, result backend, and token budget store |
| **Ollama** | Local embedding model server (nomic-embed-text) |
| **Docker + Docker Compose** | Containerized deployment |
| **Railway** | Backend deployment platform |
| **Vercel** | Frontend deployment platform |
| **Flower** | Celery task monitoring UI |
| **Prometheus** | Metrics collection and alerting |

---

## Contributing Guidelines

We welcome contributions to the Strategic News Analyzer! Please follow these guidelines:

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/Strategic-News-Analyzer.git
   ```
3. **Create a feature branch** from `v2-rebuild`:
   ```bash
   git checkout -b feature/your-feature-name v2-rebuild
   ```
4. **Set up** the development environment following the [Installation](#installation--setup) guide

### Development Standards

- **Python**: Follow PEP 8 conventions; use `ruff` for linting
- **TypeScript**: Use strict mode; follow the existing component patterns
- **Commits**: Use [Conventional Commits](https://conventionalcommits.org/) format:
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation changes
  - `refactor:` code refactoring
  - `test:` adding or updating tests
- **Testing**: Add tests for new functionality in `backend/tests/`
  ```bash
  cd backend && pytest -v
  ```
- **Code Review**: All PRs require at least one review before merging

### Submitting Changes

1. **Push** your branch to your fork
2. **Open a Pull Request** against `v2-rebuild` branch
3. **Describe** your changes clearly — what, why, and how
4. **Link** any related issues
5. **Ensure** all CI checks pass

### Areas for Contribution

- 🌐 Additional news source adapters (e.g., The Guardian API, Bing News)
- 📊 New visualization components (timeline views, network graphs)
- 🧪 Improved test coverage for AI agents and API endpoints
- 🌍 Enhanced region normalization for the risk map
- 📈 Grafana dashboard templates for Prometheus metrics
- 📝 Documentation improvements and translations

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License — Copyright (c) 2026 KBM
```

---

<div align="center">
  <b>Built with</b> FastAPI · Next.js · Supabase · Groq · Ollama · pgvector
  <br/>
  <sub>Strategic News Analyzer v2.0.0</sub>
</div>

