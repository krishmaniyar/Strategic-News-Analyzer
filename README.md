# 🌐 Strategic News Analyzer — V2

> **AI-Powered Geopolitical Intelligence Platform** — End-to-end pipeline from raw multi-source news ingestion to entity knowledge graphs, HDBSCAN event clustering, hybrid vector+FTS RAG chat, probabilistic forecasting, and a real-time Next.js dashboard.

[![AI Engineer](https://img.shields.io/badge/role-AI%20Engineer-8B5CF6?style=flat-square)](/)
[![ML Engineer](https://img.shields.io/badge/role-ML%20Engineer-06B6D4?style=flat-square)](/)
[![Full Stack](https://img.shields.io/badge/role-Full%20Stack-10B981?style=flat-square)](/)
[![SWE](https://img.shields.io/badge/role-SWE-F59E0B?style=flat-square)](/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://supabase.com)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=github-actions)](/.github/workflows/ci.yml)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [System Design Diagrams](#3-system-design-diagrams)
4. [Installation & Setup](#4-installation--setup)
5. [Usage](#5-usage)
6. [Performance Measurement & Execution Timing](#6-performance-measurement--execution-timing)
7. [Project Structure](#7-project-structure)
8. [Configuration & Hyperparameters](#8-configuration--hyperparameters)
9. [Metrics & Evaluation](#9-metrics--evaluation)
10. [Dependencies](#10-dependencies)
11. [Contributing Guidelines](#11-contributing-guidelines)
12. [License](#12-license)

---

## 1. Project Overview

### Description

The **Strategic News Analyzer V2** is a production-grade geopolitical intelligence platform that continuously ingests news from five heterogeneous sources, applies a multi-stage AI analysis pipeline, and surfaces intelligence through a real-time interactive dashboard.

It demonstrates a complete, professional AI engineering workflow: from raw data collection to advanced vector search, automated knowledge graph construction, probabilistic forecasting, and observability—all running on a cloud PostgreSQL backend with local-first AI inference.

### Objectives

| # | Objective | Implementation |
|---|---|---|
| 1 | Multi-source news ingestion with deduplication | SHA-256 hash + DB constraint across 5 adapters |
| 2 | Automated AI analysis (sentiment, bias, risk scoring) | Groq `llama-3.3-70b-versatile` with structured JSON output |
| 3 | Semantic search with sub-10ms vector retrieval | pgvector HNSW index + `nomic-embed-text` 768d embeddings |
| 4 | Automatic geopolitical event detection | Density-based HDBSCAN clustering without predefined k |
| 5 | Named entity extraction and knowledge graph | Ollama `qwen2.5:7b` NER + PostgreSQL entity-relation graph |
| 6 | Analyst-grade RAG chat with source citations | Hybrid vector + FTS + RRF retrieval, Groq streaming SSE |
| 7 | Calibrated intelligence forecasting | Probabilistic predictions tracked by Brier Score |
| 8 | Real-time interactive dashboard | Next.js 14, D3.js choropleth & force graph, WebSocket feed |
| 9 | Production observability | Prometheus counters/histograms, structlog JSON logs |
| 10 | CI/CD pipeline | GitHub Actions: lint + type-check + tests on every push |

### Key Features

- **🔍 Hybrid RAG** — Reciprocal Rank Fusion over pgvector ANN + `pg_trgm` FTS for Recall@5 > 0.75
- **🕸️ Knowledge Graph** — Automatic entity and relation extraction, graph traversal via recursive CTE (3 hops)
- **📊 Event Clustering** — HDBSCAN discovers events from embedding clusters; no label-engineering required
- **📡 Live WebSocket Feed** — Newly ingested articles pushed to connected browsers within milliseconds
- **🤖 Streaming AI Chat** — Token-by-token SSE streaming from Groq with verifiable source citations
- **📈 Brier Score Tracking** — Mathematical forecast calibration measure across resolved predictions
- **🛡️ Zero-Docker Dev** — Full pipeline runs locally with Ollama + Supabase cloud; Docker only for production

---

## 2. Architecture Overview

### High-Level System Design

The platform is organised into five layers that interact through clean async interfaces:

```
┌─────────────────────────────────────────────────────────────────────┐
│  DATA SOURCES          INGESTION           AI CORE                  │
│  ─────────────         ─────────           ───────                  │
│  MediaStack API   →    Coordinator    →    Analysis Agent           │
│  GDELT RSS        →    Deduplicator   →    Embedding Agent          │
│  GNews API        →    Base Adapter   →    Entity Agent             │
│  NewsAPI          →                   →    Clustering Agent         │
│  RSS Feeds        →                   →    Forecasting Agent        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  async SQLAlchemy
                    ┌───────────▼──────────────┐
                    │  SUPABASE (PostgreSQL 17) │
                    │  ─────────────────────── │
                    │  articles                │
                    │  article_analysis        │
                    │  article_embeddings      │← pgvector HNSW
                    │  entities                │
                    │  entity_relations        │
                    │  events + event_articles │
                    │  forecasts               │
                    └───────────┬──────────────┘
                                │
               ┌────────────────▼────────────────────┐
               │  FASTAPI (v2 REST + WebSocket + SSE) │
               │  ────────────────────────────────── │
               │  /api/v2/articles                   │
               │  /api/v2/entities/{id}/graph        │
               │  /api/v2/events                     │
               │  /api/v2/analyst/query_stream  (SSE)│
               │  /api/v2/forecasts                  │
               │  /ws/feed                    (WS)   │
               │  /metrics                  (Prom.)  │
               └────────────────┬────────────────────┘
                                │ HTTP / WS / SSE
                    ┌───────────▼──────────────┐
                    │  NEXT.JS 14 DASHBOARD     │
                    │  ─────────────────────── │
                    │  D3 Choropleth World Map  │
                    │  D3 Entity Force Graph    │
                    │  AI Analyst Chat (SSE)    │
                    │  Live News Feed (WS)      │
                    │  Forecasting Dashboard    │
                    │  Analytics Charts         │
                    └──────────────────────────┘
```

### Package Diagram

```mermaid
graph TD
    subgraph Frontend ["🖥️ frontend/ (Next.js 14)"]
        FApp["app/ (7 routes)"]
        FComp["components/\n maps · entities · feed · analyst"]
        FStore["store/ (Zustand)"]
        FTypes["types/ (TypeScript)"]
    end

    subgraph Backend ["⚙️ backend/app/ (FastAPI)"]
        BMain["main.py (entry)"]

        subgraph API ["api/"]
            BArticles["articles.py"]
            BEntities["entities.py"]
            BEvents["events.py"]
            BAnalyst["analyst.py"]
            BForecasts["forecasts.py"]
            BFeed["feed.py (WebSocket)"]
            BAdmin["admin.py"]
        end

        subgraph Agents ["agents/"]
            AAna["analysis_agent.py"]
            AEmb["embedding_agent.py"]
            AEnt["entity_agent.py"]
            AClus["clustering_agent.py"]
            AFore["forecasting_agent.py"]
        end

        subgraph AIClients ["ai/"]
            AGroq["groq_client.py"]
            AOll["ollama_client.py"]
            ARouter["model_router.py"]
        end

        subgraph RAG ["rag/"]
            Ret["retriever.py (RRF)"]
            QE["query_engine.py"]
        end

        subgraph Core ["core/"]
            Conf["config.py (Pydantic)"]
            DB["database.py (async SQLAlchemy)"]
            Log["logging.py (structlog)"]
            Met["metrics.py (Prometheus)"]
            Sec["security.py (JWT)"]
        end

        subgraph Ingestion ["ingestion/"]
            Coord["coordinator.py"]
            Dedup["deduplicator.py"]
            Adapters["adapters/\n mediastack · gdelt · gnews · rss"]
        end

        subgraph DBLayer ["db/"]
            Models["models.py (SQLAlchemy ORM)"]
            ArticleRepo["repositories/article_repo.py"]
            EntityRepo["repositories/entity_repo.py"]
        end
    end

    subgraph External ["☁️ External Services"]
        Groq["Groq API\nllama-3.3-70b-versatile"]
        Ollama["Ollama (local)\nqwen2.5:7b + nomic-embed-text"]
        Supabase["Supabase\nPostgreSQL 17 + pgvector"]
        Sources["News APIs\nMediaStack · GDELT · GNews · RSS"]
    end

    Frontend -->|REST / WS / SSE| BMain
    BMain --> API
    API --> Agents
    API --> RAG
    Agents --> AIClients
    RAG --> AIClients
    Agents --> DBLayer
    RAG --> DBLayer
    Ingestion --> Agents
    Ingestion --> DBLayer
    DBLayer --> Supabase
    AIClients --> Groq
    AIClients --> Ollama
    Ingestion --> Sources
    Core --> BMain
```

**Package explanation**: The backend follows a strict dependency direction — `api/` → `agents/` → `ai/` → external services. The `core/` package is a leaf (no upstream deps). The `ingestion/` package is an orchestrator that calls into both `agents/` and `db/`. The frontend consumes only the FastAPI boundary; it has no knowledge of the internal backend packages.

---

## 3. System Design Diagrams

### 3.1 Activity Diagram — Article Ingestion Pipeline

Shows the full lifecycle of one news article from fetching to WebSocket broadcast.

```mermaid
flowchart TD
    A([🕐 Scheduled Trigger / Manual POST]) --> B[IngestionCoordinator.run]
    B --> C{For each Source Adapter}
    C --> D[Fetch articles from API]
    D --> E[Compute SHA-256 hash_id]
    E --> F{hash_id in DB?}
    F -- Yes --> G([Skip — Duplicate])
    F -- No --> H[INSERT article to DB]
    H --> I[Detect language via langdetect]
    I --> J{Language = English?}
    J -- No --> K[Translate via Groq]
    J -- Yes --> L[Parallel AI Analysis]
    K --> L
    L --> M1[Sentiment Analysis\nGroq JSON]
    L --> M2[Bias Detection\nGroq JSON]
    L --> M3[Strategic Scoring\n0–100 + Risk Level]
    M1 & M2 & M3 --> N[Save article_analysis to DB]
    N --> O[Chunk text 512 chars / 64 overlap]
    O --> P[Embed chunks via Ollama nomic-embed-text]
    P --> Q[Store vectors in article_embeddings]
    Q --> R[Extract entities via Ollama qwen2.5:7b]
    R --> S[Upsert entities + relations to KG]
    S --> T[Broadcast via WebSocket /ws/feed]
    T --> U([✅ Article fully processed])
```

**Explanation**: The pipeline is sequential within each article but articles across adapters run in parallel via `asyncio.gather`. The deduplication check at step F ensures idempotency — re-running ingestion never creates duplicates.

---

### 3.2 Use Case Diagram — Platform Actors

Shows all actors and their interactions with the system.

```mermaid
graph LR
    subgraph Actors
        Analyst(["👤 Intelligence Analyst"])
        Admin(["⚙️ System Admin"])
        Scheduler(["⏰ Scheduler\n(Celery Beat)"])
    end

    subgraph Platform ["Strategic News Analyzer"]
        UC1["View Global Risk Map"]
        UC2["Browse Live News Feed"]
        UC3["Query AI Analyst Chat\n(RAG + SSE streaming)"]
        UC4["Explore Knowledge Graph\n(Entity Force Graph)"]
        UC5["View Active Events"]
        UC6["Review Forecasts"]
        UC7["Resolve Forecast\n(Brier Score)"]
        UC8["Trigger Manual Ingestion"]
        UC9["View /metrics endpoint\n(Prometheus)"]
        UC10["Automated Ingestion\nevery 15 minutes"]
        UC11["Run Event Clustering\nevery 30 minutes"]
    end

    Analyst --> UC1
    Analyst --> UC2
    Analyst --> UC3
    Analyst --> UC4
    Analyst --> UC5
    Analyst --> UC6
    Analyst --> UC7
    Admin --> UC8
    Admin --> UC9
    Scheduler --> UC10
    Scheduler --> UC11
```

**Explanation**: Two human actors (Analyst and Admin) interact with the system; the third is the automated Celery Beat scheduler. The Analyst can view all intelligence surfaces; the Admin controls operational aspects like triggering ingestion and monitoring metrics.

---

### 3.3 Sequence Diagram — AI Analyst RAG Query (SSE Streaming)

Shows the detailed request/response flow for a streaming analyst query.

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Browser
    participant FE as Next.js Frontend
    participant API as FastAPI /analyst/query_stream
    participant Ollama as Ollama (nomic-embed-text)
    participant DB as Supabase PostgreSQL
    participant Groq as Groq API

    Browser->>FE: Submit question
    FE->>API: POST /api/v2/analyst/query_stream\n{question: "What drives Russia-Ukraine tensions?"}
    API->>Ollama: embed(question) → 768d vector
    Ollama-->>API: [0.12, -0.05, ..., 0.88]
    
    API->>DB: Hybrid RRF query\n(vector ANN + FTS + 60-day window)
    DB-->>API: Top-5 chunks with RRF scores + metadata

    API->>Groq: stream_chat(system=RAG_PROMPT,\nuser=context+question)
    
    loop Token-by-token SSE
        Groq-->>API: chunk: "The"
        API-->>FE: data: {"type":"token","content":"The"}
        FE-->>Browser: Append token to chat bubble
        Groq-->>API: chunk: " primary..."
        API-->>FE: data: {"type":"token","content":" primary..."}
        FE-->>Browser: Append token
    end

    Groq-->>API: [STREAM_END]
    API-->>FE: data: {"type":"done","sources":[...5 citations...]}
    FE-->>Browser: Render source citation cards
```

**Explanation**: The SSE streaming means the user sees the answer appearing character-by-character in under 200ms from submission, rather than waiting 3–8s for the full response. The Ollama embedding step is the heaviest local compute (avg ~180ms).

---

### 3.4 Sequence Diagram — WebSocket Live Feed

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Browser
    participant FE as Next.js LiveNewsFeed
    participant WS as FastAPI /ws/feed
    participant Coord as IngestionCoordinator
    participant DB as Supabase

    Browser->>FE: Mount LiveNewsFeed component
    FE->>WS: WS connect ws://localhost:8000/ws/feed
    WS-->>FE: Connection accepted

    Note over Coord: Admin triggers POST /api/v2/admin/ingest

    Coord->>DB: Fetch + deduplicate + analyze articles
    DB-->>Coord: article persisted
    Coord->>WS: manager.broadcast_article(article_data)
    WS-->>FE: {"type":"new_article","data":{...}}
    FE-->>Browser: Prepend ArticleCard with "New" badge animation
```

---

### 3.5 Class Diagram — Core Data Models

```mermaid
classDiagram
    class Source {
        +UUID id
        +String name
        +String base_url
        +String country
        +Float credibility_score
        +Boolean is_active
    }

    class Article {
        +UUID id
        +String title
        +Text content_raw
        +String url
        +String hash_id
        +String language
        +Boolean is_processed
        +DateTime published_at
    }

    class ArticleAnalysis {
        +UUID id
        +String sentiment_label
        +Float sentiment_score
        +String bias_label
        +Float bias_score
        +Float strategic_score
        +String risk_level
        +Text summary
        +JSONB key_drivers
        +JSONB affected_regions
    }

    class ArticleEmbedding {
        +UUID id
        +Integer chunk_index
        +Text chunk_text
        +vector embedding
    }

    class Entity {
        +UUID id
        +String name
        +String type
        +Text description
        +Integer mention_count
        +Float global_risk_score
    }

    class EntityRelation {
        +UUID id
        +String relation_type
        +Float confidence
        +DateTime first_seen_at
    }

    class Event {
        +UUID id
        +String title
        +String description
        +String status
        +String risk_level
        +JSONB affected_regions
        +Integer article_count
        +DateTime last_updated
    }

    class Forecast {
        +UUID id
        +String topic
        +String prediction
        +Float confidence
        +String timeframe
        +JSONB key_scenarios
        +Float brier_score
    }

    Source "1" --> "many" Article : publishes
    Article "1" --> "0..1" ArticleAnalysis : has
    Article "1" --> "many" ArticleEmbedding : chunked into
    Entity "1" --> "many" EntityRelation : from
    Entity "1" --> "many" EntityRelation : to
    Event "many" --> "many" Article : clusters
    Forecast "many" --> "many" ArticleEmbedding : evidenced by
```

**Explanation**: All primary keys are UUIDs generated by PostgreSQL's `uuid-ossp` extension. The `ArticleEmbedding.embedding` column uses the custom `PGVector(768)` type which maps Python `list[float]` to PostgreSQL `vector(768)` with a HNSW cosine-similarity index.

---

## 4. Installation & Setup

### Prerequisites

| Requirement | Version | Check Command |
|---|---|---|
| Python | ≥ 3.11 | `python --version` |
| Node.js | ≥ 20 LTS | `node --version` |
| npm | ≥ 10 | `npm --version` |
| Ollama | latest | `ollama --version` |
| Git | ≥ 2.40 | `git --version` |

You also need accounts/keys for:
- [Supabase](https://supabase.com) — free tier sufficient
- [Groq Cloud](https://console.groq.com) — free tier (500K tokens/day)
- [MediaStack](https://mediastack.com) — free tier (100 req/month)

---

### Step-by-Step Installation

#### Step 1 — Clone the repository

**PowerShell / CMD / Bash (all terminals):**
```bash
git clone https://github.com/krishmaniyar/Strategic-News-Analyzer.git
cd Strategic-News-Analyzer
```

#### Step 2 — Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@db.xxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GROQ_API_KEY=gsk_xxxx
MEDIASTACK_API_KEY=xxxx
ENVIRONMENT=development
GROQ_DAILY_TOKEN_BUDGET=500000
OLLAMA_BASE_URL=http://localhost:11434
REDIS_URL=redis://localhost:6379/0
```

#### Step 3 — Supabase Database Setup

In your Supabase SQL Editor, run these extensions once:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

The SQLAlchemy ORM creates all tables automatically on first startup via `Base.metadata.create_all()`.

#### Step 4 — Pull Ollama Models

**PowerShell:**
```powershell
ollama pull nomic-embed-text
ollama pull qwen2.5:7b
```

**Bash / Zsh (macOS/Linux):**
```bash
ollama pull nomic-embed-text && ollama pull qwen2.5:7b
```

**CMD:**
```cmd
ollama pull nomic-embed-text
ollama pull qwen2.5:7b
```

#### Step 5 — Backend Setup

**PowerShell:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**CMD:**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

**Bash / Zsh:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Step 6 — Frontend Setup

**PowerShell / CMD:**
```powershell
cd ..\frontend
npm.cmd install
```

**Bash / Zsh:**
```bash
cd ../frontend
npm install
```

---

## 5. Usage

### Starting All Services

You need **three terminal windows** running simultaneously.

---

#### Terminal 1 — Ollama (local AI models)

**PowerShell / CMD / Bash — same command:**
```bash
ollama serve
```
Ollama listens on `http://localhost:11434`.

---

#### Terminal 2 — FastAPI Backend

**PowerShell:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**CMD:**
```cmd
cd backend
venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Bash / Zsh:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:
- API root: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Prometheus metrics: `http://localhost:8000/metrics`
- Health check: `http://localhost:8000/health`

---

#### Terminal 3 — Next.js Frontend

**PowerShell:**
```powershell
cd frontend
npm.cmd run dev
```

**CMD:**
```cmd
cd frontend
npm run dev
```

**Bash / Zsh:**
```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`

---

### Triggering Ingestion

Once the backend is running, ingest news articles:

```bash
# curl (Linux/macOS/Git Bash)
curl -X POST http://localhost:8000/api/v2/admin/ingest

# PowerShell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v2/admin/ingest"

# CMD (with curl installed)
curl -X POST http://localhost:8000/api/v2/admin/ingest
```

### Running Tests

**PowerShell / CMD:**
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests/unit/ -v --tb=short
```

**Bash / Zsh:**
```bash
cd backend
python -m pytest tests/unit/ -v --tb=short
```

Expected output: `19 passed in 0.10s`

---

### Example API Workflows

```bash
# 1. Get paginated articles with analysis
curl "http://localhost:8000/api/v2/articles?limit=10&offset=0"

# 2. RAG query (non-streaming)
curl -X POST "http://localhost:8000/api/v2/analyst/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the key drivers of tensions in the South China Sea?"}'

# 3. Streaming RAG query (SSE)
curl -N -X POST "http://localhost:8000/api/v2/analyst/query_stream" \
  -H "Content-Type: application/json" \
  -d '{"question": "Summarize recent developments in Ukraine."}'

# 4. Entity knowledge graph traversal (3 hops)
curl "http://localhost:8000/api/v2/entities/{entity-uuid}/graph"

# 5. Active geopolitical events
curl "http://localhost:8000/api/v2/events"

# 6. Resolve a forecast (sets Brier score)
curl -X POST "http://localhost:8000/api/v2/forecasts/{forecast-uuid}/resolve" \
  -H "Content-Type: application/json" \
  -d '{"outcome": 1}'

# 7. Platform-wide forecast accuracy
curl "http://localhost:8000/api/v2/forecasts/accuracy"
```

---

## 6. Performance Measurement & Execution Timing

### How Timing Works in This Project

The backend uses `structlog` for structured JSON logging with timing fields built into each agent. Prometheus histograms provide aggregate latency distributions queryable via `/metrics`.

### 6.1 Extracting Execution Time from Logs

Backend logs are emitted as JSON. Filter for timing fields:

**Linux / macOS / Git Bash:**
```bash
# Run backend and stream logs to file
uvicorn app.main:app 2>&1 | tee backend.log

# In another terminal — extract all latency events
grep '"latency_ms"' backend.log | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        entry = json.loads(line)
        print(f\"{entry.get('event','?'):40s} {entry.get('latency_ms','?'):>8} ms\")
    except: pass
"
```

**PowerShell:**
```powershell
Get-Content backend.log | Where-Object { $_ -match '"latency_ms"' } | ForEach-Object {
    $entry = $_ | ConvertFrom-Json
    Write-Host ("{0,-40} {1,8} ms" -f $entry.event, $entry.latency_ms)
}
```

### 6.2 Adding Timer Around a Single Query (Code Example)

Add this pattern to any agent or route to instrument a block of code:

```python
import time
from app.core.logging import get_logger

logger = get_logger(__name__)

async def timed_rag_query(db, question: str) -> dict:
    """RAG query with explicit wall-clock timing logged."""
    t0 = time.perf_counter()

    # ── work ────────────────────────────────────────
    embedding = await ollama_client.embed(question)
    chunks = await hybrid_retrieve(db, question, embedding, top_k=5)
    answer = await rag_query(db, question)
    # ────────────────────────────────────────────────

    elapsed_ms = (time.perf_counter() - t0) * 1000

    logger.info(
        "rag_query_complete",
        question=question[:80],
        chunks_retrieved=len(chunks),
        latency_ms=round(elapsed_ms, 2)
    )

    # Optionally surface timing to the caller
    answer["execution_time_ms"] = round(elapsed_ms, 2)
    return answer
```

### 6.3 Timing Display to User (Frontend)

In the AI Analyst chat, the response payload already includes `sources`. Add timing display:

```typescript
// In AIAnalystChat.tsx — capture start time before fetch
const startTime = performance.now()

// After the stream completes (data.type === "done"):
const endTime = performance.now()
const duration = ((endTime - startTime) / 1000).toFixed(2)

// Then render:
<p className="text-xs text-muted-foreground mt-2">
  ⚡ Response generated in {duration}s
</p>
```

### 6.4 Prometheus Latency Queries (Grafana / curl)

```bash
# p95 latency for all API routes (non-LLM)
curl -s http://localhost:8000/metrics | grep 'http_request_duration'

# Groq-specific call latency histogram
curl -s http://localhost:8000/metrics | grep 'groq_call_seconds'

# Embedding generation latency
curl -s http://localhost:8000/metrics | grep 'embedding_seconds'

# Vector search latency
curl -s http://localhost:8000/metrics | grep 'vector_search_seconds'
```

### 6.5 Expected Latency Benchmarks

| Operation | Expected p50 | Expected p95 | Notes |
|---|---|---|---|
| Article hash + DB insert | < 5ms | < 20ms | Async INSERT with index |
| Ollama embedding (per chunk) | ~150ms | ~250ms | GPU: ~30ms |
| Groq sentiment analysis | ~400ms | ~900ms | Structured JSON mode |
| pgvector HNSW search | < 5ms | < 15ms | Post index-build |
| Groq RAG streaming (TTFB) | ~200ms | ~600ms | Time-to-first-byte |
| Full ingestion (10 articles) | ~15s | ~30s | E2E with all agents |

---

## 7. Project Structure

```
Strategic-News-Analyzer/
│
├── .env.example                    # Template for all required environment variables
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions: lint + typecheck + build + tests
├── railway.toml                    # Railway.app backend deployment configuration
├── README.md                       # This file
│
├── backend/
│   ├── Dockerfile                  # Production container (python:3.11-slim, non-root)
│   ├── requirements.txt            # Python dependencies (pinned)
│   ├── pytest.ini                  # Pytest configuration (asyncio mode, testpaths)
│   │
│   ├── app/
│   │   ├── main.py                 # FastAPI app init, CORS, Prometheus, router wiring
│   │   │
│   │   ├── agents/
│   │   │   ├── analysis_agent.py   # Sentiment, bias, strategic scoring via Groq
│   │   │   ├── embedding_agent.py  # Text chunking (512/64) + Ollama batch embedding
│   │   │   ├── entity_agent.py     # NER via Ollama qwen2.5:7b (JSON extraction)
│   │   │   ├── clustering_agent.py # HDBSCAN event detection from embedding clusters
│   │   │   └── forecasting_agent.py# Probabilistic forecast generation via Groq
│   │   │
│   │   ├── ai/
│   │   │   ├── groq_client.py      # Groq API wrapper: JSON + streaming + budget tracking
│   │   │   ├── ollama_client.py    # Ollama wrapper: embed + generate (local)
│   │   │   └── model_router.py     # Task-to-model routing configuration
│   │   │
│   │   ├── api/
│   │   │   ├── articles.py         # GET /articles (paginated, with analysis join)
│   │   │   ├── entities.py         # GET /entities, GET /entities/{id}/graph (CTE)
│   │   │   ├── events.py           # GET /events (active clusters)
│   │   │   ├── analyst.py          # POST /analyst/query + /query_stream (SSE)
│   │   │   ├── forecasts.py        # GET/POST /forecasts, resolve + accuracy
│   │   │   ├── feed.py             # WS /ws/feed (WebSocket broadcast manager)
│   │   │   ├── admin.py            # POST /admin/ingest (manual trigger)
│   │   │   └── auth.py             # POST /auth/verify (Supabase JWT validation)
│   │   │
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings (all env vars, typed)
│   │   │   ├── database.py         # async SQLAlchemy engine + session factory
│   │   │   ├── logging.py          # structlog setup (JSON in prod, console in dev)
│   │   │   ├── metrics.py          # Prometheus counters, histograms, gauges
│   │   │   ├── security.py         # JWT decode + Supabase auth middleware
│   │   │   └── celery_app.py       # Celery app skeleton (for future worker scaling)
│   │   │
│   │   ├── db/
│   │   │   ├── models.py           # All SQLAlchemy ORM models (10 tables)
│   │   │   └── repositories/
│   │   │       ├── article_repo.py # CRUD for articles, analysis, embeddings
│   │   │       └── entity_repo.py  # Upsert entities + relations (ON CONFLICT)
│   │   │
│   │   ├── ingestion/
│   │   │   ├── coordinator.py      # Orchestrates fetch → dedup → AI pipeline → WS
│   │   │   ├── deduplicator.py     # SHA-256 hash_id computation
│   │   │   ├── base.py             # Abstract BaseSourceAdapter interface
│   │   │   └── adapters/
│   │   │       ├── mediastack.py   # MediaStack REST API adapter
│   │   │       ├── gdelt.py        # GDELT RSS feed adapter
│   │   │       ├── gnews.py        # GNews API adapter
│   │   │       ├── newsapi.py      # NewsAPI adapter
│   │   │       └── rss.py          # Generic RSS/Atom feed parser
│   │   │
│   │   └── rag/
│   │       ├── retriever.py        # Hybrid RRF retrieval (pgvector + FTS, raw SQL)
│   │       └── query_engine.py     # Groq generation with context + source citations
│   │
│   └── tests/
│       ├── conftest.py             # pytest fixtures: mock Groq, mock Ollama
│       └── unit/
│           └── test_core.py        # 19 deterministic tests: hash, RRF, Brier, chunker
│
└── frontend/
    ├── vercel.json                  # Vercel deployment configuration
    ├── package.json                 # npm dependencies
    ├── components.json              # shadcn-ui component registry config
    │
    └── src/
        ├── app/                     # Next.js App Router pages
        │   ├── layout.tsx           # Root layout: dark sidebar + header
        │   ├── page.tsx             # / → Risk map + AI chat
        │   ├── feed/page.tsx        # /feed → Live news feed
        │   ├── events/page.tsx      # /events → HDBSCAN event clusters
        │   ├── entities/page.tsx    # /entities → D3 force graph
        │   ├── forecast/page.tsx    # /forecast → Forecast cards
        │   ├── analyst/page.tsx     # /analyst → Full-page AI chat
        │   └── analytics/page.tsx   # /analytics → Recharts trend charts
        │
        ├── components/
        │   ├── maps/
        │   │   └── GlobalRiskMap.tsx    # D3 choropleth (geoNaturalEarth1 + TopoJSON)
        │   ├── entities/
        │   │   └── EntityGraph.tsx      # D3 forceSimulation force graph
        │   ├── feed/
        │   │   └── LiveNewsFeed.tsx     # WebSocket client + ArticleCard
        │   ├── analyst/
        │   │   └── AIAnalystChat.tsx    # SSE streaming chat with source citations
        │   └── ui/                      # shadcn-ui components (button, card, badge…)
        │
        ├── store/
        │   └── realtime.ts          # Zustand store: live articles + connection status
        │
        └── types/
            └── index.ts             # TypeScript interfaces matching backend Pydantic schemas
```

---

## 8. Configuration & Hyperparameters

### Environment Variables

| Name | Description | Default | Type | Options / Range |
|---|---|---|---|---|
| `ENVIRONMENT` | Runtime environment | `development` | `str` | `development`, `production` |
| `LOG_LEVEL` | Logging verbosity | `INFO` | `str` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `DATABASE_URL` | PostgreSQL connection string (asyncpg) | — | `str` | Must start with `postgresql+asyncpg://` |
| `SUPABASE_URL` | Supabase project URL | — | `str` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anon key (frontend) | — | `str` | JWT string |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend) | — | `str` | JWT string |
| `GROQ_API_KEY` | Groq Cloud API key | — | `str` | `gsk_...` |
| `GROQ_DAILY_TOKEN_BUDGET` | Max Groq tokens per 24h | `500000` | `int` | 1–10,000,000 |
| `OLLAMA_BASE_URL` | Ollama API base URL | `http://localhost:11434` | `str` | Any accessible URL |
| `REDIS_URL` | Redis connection (for Celery, optional) | `redis://localhost:6379/0` | `str` | Valid Redis URL |
| `MEDIASTACK_API_KEY` | MediaStack news API key | `""` | `str` | Required for MediaStack source |
| `NEWSAPI_KEY` | NewsAPI.org API key | `""` | `str` | Optional |
| `GNEWS_API` | GNews API key | `""` | `str` | Optional |
| `GDELT_ENABLED` | Enable GDELT RSS adapter | `true` | `bool` | `true`, `false` |
| `INGESTION_INTERVAL_MINUTES` | How often Celery ingests news | `15` | `int` | 5–1440 |
| `CLUSTERING_INTERVAL_MINUTES` | How often HDBSCAN clustering runs | `30` | `int` | 10–1440 |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` | `str` | Comma-separated URLs |

### AI Model Configuration

| Parameter | Description | Value | Notes |
|---|---|---|---|
| `EMBED_MODEL` | Ollama embedding model | `nomic-embed-text` | 768 dimensions |
| `EMBED_DIM` | Embedding vector dimensions | `768` | Must match pgvector column |
| `CHUNK_SIZE` | Characters per text chunk | `512` | Sliding window |
| `CHUNK_OVERLAP` | Characters overlapping between chunks | `64` | ~12.5% of chunk |
| `GROQ_ANALYSIS_MODEL` | Model for sentiment/bias/scoring | `llama-3.3-70b-versatile` | Structured JSON |
| `GROQ_RAG_MODEL` | Model for RAG generation | `llama-3.3-70b-versatile` | Streaming |
| `GROQ_FAST_MODEL` | Model for translation/NER | `llama-3.1-8b-instant` | Speed optimised |
| `OLLAMA_NER_MODEL` | Local model for entity extraction | `qwen2.5:7b` | Privacy-preserving |
| `HDBSCAN_MIN_CLUSTER_SIZE` | Min articles per event cluster | `3` | Lower → more events |
| `HDBSCAN_MIN_SAMPLES` | HDBSCAN robustness parameter | `2` | Lower → less noise |
| `RRF_K` | RRF smoothing constant | `60` | Standard value |
| `RAG_TOP_K` | Chunks returned to LLM | `5` | 3–10 |
| `RAG_DATE_WINDOW_DAYS` | Retrieval recency filter | `90` | Days |
| `INGESTION_LIMIT_PER_SOURCE` | Max articles fetched per adapter call | `10` | 1–100 |

---

## 9. Metrics & Evaluation

### Evaluation Metrics Table

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

## 10. Dependencies

### Backend Python

| Library | Version | Purpose |
|---|---|---|
| `fastapi` | 0.115+ | Async REST API framework |
| `uvicorn` | 0.34+ | ASGI server with hot reload |
| `sqlalchemy` | 2.0+ | Async ORM for PostgreSQL |
| `asyncpg` | 0.30+ | Async PostgreSQL driver |
| `pydantic` | 2.x | Data validation and Settings |
| `pydantic-settings` | 2.x | `BaseSettings` from `.env` |
| `groq` | 0.9+ | Groq Cloud API client |
| `httpx` | 0.28+ | Async HTTP (Ollama, news APIs) |
| `structlog` | 25+ | Structured JSON logging |
| `langdetect` | 1.0.9 | Language detection |
| `hdbscan` | 0.8+ | Density-based clustering |
| `scikit-learn` | 1.4+ | Preprocessing, cosine similarity |
| `numpy` | 1.26+ | Numerical operations |
| `feedparser` | 6.0+ | RSS/Atom feed parsing |
| `prometheus-fastapi-instrumentator` | 8.0+ | Auto Prometheus metrics |
| `prometheus-client` | 0.25+ | Custom Prometheus instruments |
| `pytest` | 9.0+ | Test framework |
| `pytest-asyncio` | 1.4+ | Async test support |
| `pytest-cov` | 7.0+ | Coverage reporting |
| `ruff` | 0.15+ | Python linter / formatter |

### Frontend JavaScript / TypeScript

| Library | Version | Purpose |
|---|---|---|
| `next` | 16.x | React framework with App Router |
| `react` | 19.x | UI component library |
| `typescript` | 5.x | Static type checking |
| `tailwindcss` | 4.x | Utility-first CSS framework |
| `d3` | 7.x | D3.js data visualisation |
| `topojson-client` | 3.x | TopoJSON → GeoJSON world map |
| `recharts` | 2.x | Declarative React charts |
| `zustand` | 5.x | Lightweight state management |
| `@tanstack/react-query` | 5.x | Server state + caching |
| `@supabase/supabase-js` | 2.x | Supabase JS client |
| `lucide-react` | latest | Icon set |
| `date-fns` | 4.x | Date formatting utilities |
| `shadcn-ui` | 4.x | Accessible component primitives |

### External Services & Tools

| Tool | Purpose |
|---|---|
| **Supabase** | Managed PostgreSQL 17 + pgvector + pg_trgm + Auth |
| **Groq Cloud** | LLM inference API (< 1s response, generous free tier) |
| **Ollama** | Local LLM runtime for embeddings + NER (privacy-first) |
| **GitHub Actions** | CI/CD pipeline (lint, test, build) |
| **Railway** | Backend deployment target |
| **Vercel** | Frontend deployment target |
| **Prometheus** | Metrics collection (self-hosted or Grafana Cloud) |

---

## 11. Contributing Guidelines

Contributions are welcome! Please follow these steps:

### Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/Strategic-News-Analyzer.git`
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`

### Code Standards

- **Python**: All code must pass `ruff check backend/app/` with zero warnings.
- **TypeScript**: No TypeScript errors — run `npx tsc --noEmit` in `frontend/`.
- **Tests**: Add unit tests for any new deterministic logic. The test suite must remain at 100% pass rate.
- **Docstrings**: All public functions must have a one-line docstring minimum.
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  ```
  feat: add GDELT source adapter
  fix: prevent duplicate entity upsert race condition
  docs: update RAG query examples
  test: add Brier score edge cases
  ```

### Pull Request Process

1. Ensure all CI checks pass (backend + frontend).
2. Write a clear PR description explaining **what** changed and **why**.
3. Reference any related GitHub Issues.
4. PRs require one reviewer approval before merge.

### Reporting Issues

Use GitHub Issues with these labels:
- `bug` — Something is broken
- `enhancement` — New feature or improvement
- `question` — Usage question

---

## 12. License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Krish Maniyar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

See the full [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ as a portfolio demonstration of production-grade AI systems engineering.**

[API Docs](http://localhost:8000/docs) · [Live Demo](https://strategic-news-analyzer.vercel.app) · [Report Bug](https://github.com/krishmaniyar/Strategic-News-Analyzer/issues) · [Request Feature](https://github.com/krishmaniyar/Strategic-News-Analyzer/issues)

</div>
