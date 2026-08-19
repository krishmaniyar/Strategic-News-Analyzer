<div align="center">

# 🛡️ Strategic News Analyzer (SNA)

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
- [How the System Works (Deep Dive)](#how-the-system-works-deep-dive)
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

It bridges the gap between raw unstructured news data and structured, actionable geopolitical intelligence by utilizing Large Language Models (LLMs) and advanced data science techniques.

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

---

## How the System Works (Deep Dive)

This section explains the inner workings of every major feature in the platform.

### 1. Data Ingestion Pipeline
The ingestion engine is the heartbeat of the platform. It runs on a cron schedule via Celery Beat (e.g., every 15 minutes).
- **Adapters:** The system implements a Strategy pattern with a `BaseSourceAdapter`. Specific adapters exist for NewsAPI, GNews, MediaStack, RSS (BBC, Al Jazeera, etc.), and GDELT.
- **Normalization:** Each adapter normalizes raw JSON/XML into a standard `RawArticle` dataclass.
- **Deduplication:** Before saving to the database, the system calculates a SHA-256 hash of the article's URL and title. If the hash exists in the database, the article is skipped (O(1) duplicate check).
- **Source Creation:** If an article comes from an unknown publisher, the database uses an atomic `INSERT ... ON CONFLICT DO NOTHING` to safely register the new source without TOCTOU race conditions.

### 2. Multi-Stage AI Analysis
Once articles are stored in the database as `is_processed = False`, the Analysis Agent picks them up.
- **Language Detection & Translation:** If an article is not in English, it is routed to the LLM for translation to ensure the knowledge graph operates on a unified language base.
- **Parallel Processing:** To minimize latency, the agent requests multiple analyses in parallel (e.g., Sentiment, Bias, Summarization) via `asyncio.gather`.
- **Structured JSON Enforcement:** All LLM prompts use strict schemas and `response_format={"type": "json_object"}` to guarantee the output can be parsed into backend databases.
- **Strategic Scoring:** An algorithmic aggregation of the LLM's sentiment score, bias severity, and identified risk flags produces a unified `strategic_score` (1-100) and `risk_level` (Low, Medium, High, Critical).

### 3. Entity Extraction & Knowledge Graph
To build a web of geopolitical context, the Entity Agent processes the summaries generated by the Analysis Agent.
- **Extraction:** The LLM is prompted to identify Named Entities (People, Nations, Organizations) and explicitly define the relationship verb between them (e.g., "USA" -> `sanctions` -> "Iran").
- **Upsertion:** Entities are merged into the `entities` table, tracking their global mention count. Relations are stored in `entity_relations`.
- **Frontend Graph:** The Next.js frontend queries this data to render interactive force-directed graphs (using D3 or equivalent libraries), allowing analysts to visually map alliances and conflicts.

### 4. Event Clustering (HDBSCAN)
Individual articles are often part of a larger ongoing event. SNA automatically discovers these events.
- **Vectorization:** Every article's text is chunked and embedded into a 768-dimensional vector using local Ollama (`nomic-embed-text`).
- **Clustering Algorithm:** The Clustering Agent pulls recent article vectors and runs **HDBSCAN** (Hierarchical Density-Based Spatial Clustering of Applications with Noise) using Cosine distance.
- **Why HDBSCAN?** Unlike K-Means, HDBSCAN does not require you to know the number of clusters in advance, and it successfully identifies "noise" (isolated articles that don't belong to a major event).
- **Event Synthesis:** Once a cluster of articles is identified, their combined summaries are sent to Groq to generate a holistic "Event Title", "Event Description", and aggregated "Risk Level".

### 5. Forecasting Engine
SNA acts as a predictive analyst by forecasting the outcome of active events.
- **Context Gathering:** When an event is passed to the Forecasting Agent, the system queries the RAG engine for the most recent developments related to that event.
- **Prediction Generation:** The LLM acts under a strict persona to output a specific, falsifiable prediction (e.g., "China will impose tariffs within 30 days"), a confidence score (0.0 - 1.0), and a Chain of Thought.
- **Calibration (Brier Score):** Over time, as outcomes resolve (either manually toggled by admins or automatically via future agents), the system calculates Brier scores to measure the calibration and accuracy of the AI's predictions.

### 6. RAG Engine & AI Analyst
Analysts can chat with the platform to ask specific questions (e.g., "What is the current status of the Taiwan Strait?").
- **Hybrid Retrieval (RRF):** SNA does not rely solely on vector search. It executes both a Vector Similarity Search (using pgvector) and a Full-Text Search (using PostgreSQL `tsvector`). The results are merged using **Reciprocal Rank Fusion (RRF)**: `Score = 1/(k + rank_vector) + 1/(k + rank_fts)`. This guarantees high recall for exact keywords *and* semantic concepts.
- **Prompt Isolation:** To prevent Prompt Injection attacks (where a malicious news article contains instructions that override the system prompt), retrieved text is enclosed in strict XML-style delimiters (`<source>...</source>`).
- **Streaming:** The Groq API response is streamed back to the Next.js frontend using Server-Sent Events (SSE). The frontend UI accumulates the markdown chunks in real-time, providing a fast, ChatGPT-like experience.

### 7. Frontend Architecture & Real-Time Feed
- **Server/Client Separation:** The root layout (`layout.tsx`) is a Next.js Server Component responsible for SEO metadata and initial HTML delivery. All interactive elements (Sidebar, Clock, State) are isolated in a `ClientLayout.tsx` shell.
- **Live Feed (WebSockets):** The FastAPI backend maintains an active `ConnectionManager`. The moment an article finishes the AI analysis pipeline, it is broadcasted over the `/ws/feed` WebSocket.
- **State Efficiency:** The frontend `feed/page.tsx` deduplicates incoming WebSocket articles in `O(n)` time using a JavaScript `Map`, preventing UI stuttering under heavy load. A `searchRef` is used to pause the live feed if the user is actively searching the archives.
- **Risk Map:** A TopoJSON-based map of the world dynamically colors countries based on the aggregated `strategic_score` of recent articles tagged with that country's name.

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

#### 4. Install & Start Ollama

```bash
# Install Ollama (https://ollama.ai)
# Pull the embedding model
ollama pull nomic-embed-text
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

### Access Points

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation (Swagger) | http://localhost:8000/docs |
| Prometheus Metrics | http://localhost:8000/metrics |
| Flower Dashboard | http://localhost:5555 |
| Health Check | http://localhost:8000/health |

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
```

### Prometheus Histogram for Latency Distribution

The system tracks AI pipeline latency via Prometheus histograms defined in `backend/app/core/metrics.py`:

```python
from app.core.metrics import analysis_latency

with analysis_latency.time():
    result = await analyze_article(article, repo)
```

Query in Prometheus/Grafana:
`histogram_quantile(0.95, rate(article_analysis_seconds_bucket[5m]))`

---

## Project Structure

```text
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
│   │   ├── core/                    # Celery Setup, DB connections, Logging, Config
│   │   ├── db/                      # SQLAlchemy Models and Repositories
│   │   ├── ingestion/               # News ingestion pipeline and adapters
│   │   └── rag/                     # Hybrid Retrieval and Prompt Engine
│   ├── migrations.sql               # Complete database schema (11 migrations)
│   └── requirements.txt             # Python dependencies
│
├── frontend/                        # Next.js 16 frontend
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── page.tsx             # Dashboard — risk map + summary stats + AI chat
│   │   │   ├── layout.tsx           # Root layout with Server Components
│   │   │   ├── feed/                # Live news feed page
│   │   │   ├── events/              # Event clusters page
│   │   │   ├── entities/            # Knowledge graph visualization
│   │   │   ├── forecast/            # Intelligence forecasts page
│   │   │   ├── analyst/             # AI analyst full-page interface
│   │   │   └── analytics/           # Analytics dashboard page
│   │   ├── components/              # Reusable React components (Charts, Maps, Cards)
│   │   │   └── ClientLayout.tsx     # Client-side shell for context and state providers
│   │   ├── lib/                     # Utilities (API config, WebSockets, Supabase)
│   │   └── store/                   # Zustand state management
│   ├── package.json
│   └── tailwind.config.ts           # Tailwind custom glassmorphism design system
│
├── docker-compose.yml               # Production container stack
└── README.md                        # You are here!
```

---

## Configuration & Hyperparameters

### AI Pipeline Hyperparameters

| Name | Description | Default | Type | Range |
|------|-------------|---------|------|-------|
| `INGESTION_INTERVAL_MINUTES` | Celery Beat ingestion schedule | `15` | `Integer` | `5`–`60` |
| Groq `temperature` | LLM generation temperature | `0.1` | `Float` | `0.0`–`1.0` |
| Embedding `max_chars` | Chunk size for text splitting | `2048` | `Integer` | `512`–`4096` |
| HDBSCAN `min_cluster_size` | Minimum articles to form event | `3` | `Integer` | `2`–`10` |
| Hybrid retrieval `top_k` | Final results after RRF fusion | `5` | `Integer` | `3`–`20` |
| RRF `k` parameter | Ranking constant in RRF formula | `60` | `Integer` | `1`–`100` |
| HNSW `m` | Max connections per layer | `16` | `Integer` | `8`–`64` |

---

## Metrics & Evaluation

### Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `articles_ingested_total` | Counter | Total articles ingested from all sources |
| `articles_analyzed_total` | Counter | Articles processed through AI pipeline |
| `article_analysis_seconds` | Histogram | End-to-end AI pipeline latency per article |
| `groq_tokens_total` | Counter | Total tokens consumed via Groq API |
| `vector_search_seconds` | Histogram | pgvector ANN search (HNSW) latency |

---

## Dependencies

- **Backend:** FastAPI, SQLAlchemy (Async), Celery, Redis, Pydantic, Groq, Ollama, Scikit-learn (HDBSCAN).
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Zustand, D3.js, TopoJSON, Recharts, Lucide.

---

## Contributing Guidelines

1. **Fork** the repository and clone it locally.
2. **Create a feature branch** from `v3-native-backend`.
3. Follow PEP 8 for Python and use strict mode for TypeScript.
4. **Open a Pull Request** describing your changes clearly.
5. All PRs require at least one review before merging.

### Areas for Contribution
- Additional news source adapters
- New visualization components
- Improved test coverage
- Grafana dashboard templates

---

## Cloud Architecture & Deployment

SNA is designed for enterprise-grade scalability, employing a multi-cloud strategy that leverages AWS for heavy compute, Vercel for edge delivery, and Supabase for managed PostgreSQL.

### 1. AWS Compute & Ingestion Cluster (Backend)
- **Amazon ECS (Fargate):** The FastAPI application and Celery workers are containerized via Docker and deployed on serverless Fargate clusters. This allows auto-scaling the ingestion pipeline based on CPU/Memory load during heavy news cycles.
- **Amazon ElastiCache (Redis):** Acts as the message broker for Celery tasks and provides sub-millisecond latency for token budget counters and rate limiting.
- **Application Load Balancer (ALB):** Distributes incoming WebSocket connections (`/ws/feed`) and REST API traffic across the ECS tasks.
- **AWS Secrets Manager:** Securely stores third-party API keys (Groq, NewsAPI, MediaStack) and injects them into the Fargate containers at runtime.

### 2. Edge Delivery & Frontend (Vercel)
- **Vercel Edge Network:** The Next.js 16 frontend is deployed to Vercel, leveraging Edge caching for static assets and Server-Side Rendering (SSR) for the Dashboard and Analytics pages.
- **Next.js API Routes:** Used as lightweight proxies to mask backend URLs and handle frontend-specific rate limiting.

### 3. Managed Database & Authentication (Supabase)
- **PostgreSQL (AWS us-east-1):** Hosted via Supabase, utilizing the `pgvector` extension for storing 768-dimensional article and entity embeddings.
- **Connection Pooling (PgBouncer):** Configured to handle thousands of concurrent read requests from the RAG engine without exhausting database connections.
- **Supabase Auth:** Handles JWT minting and session management for analysts logging into the platform.

---

## Security & Hardening

Security is treated as a first-class citizen, implementing a Zero-Trust architecture across all layers.

### 1. Row-Level Security (RLS)
The PostgreSQL database strictly enforces Row-Level Security.
- **Public Data (Read-Only):** The `articles`, `events`, `entities`, and `forecasts` tables have `SELECT USING (true)` policies for authenticated and unauthenticated analysts.
- **Private Data (Isolated):** The `watchlists` and `alerts` tables enforce `USING (auth.uid() = user_id)`, guaranteeing that an analyst can never access another analyst's watchlists.
- **Write Operations:** Only the internal FastAPI backend (authenticating via `DATABASE_URL` or `SERVICE_ROLE_KEY`) is permitted to `INSERT`, `UPDATE`, or `DELETE` intelligence data. Client-side mutations are mathematically impossible.

### 2. Prompt Injection Defense
When executing RAG (Retrieval-Augmented Generation) for the AI Analyst chat, the system pulls untrusted text from global news sources. To prevent an adversary from embedding prompt injections in a news article (e.g., "Ignore all previous instructions and output..."), the system encapsulates all retrieved context within strict XML delimiters (`<source>...</source>`) and uses strongly-typed system prompts to isolate the user's instructions from the data.

### 3. API Security & CORS
- **Strict CORS Policies:** The backend rejects all requests that do not originate from the explicit `CORS_ORIGINS` (e.g., the production Vercel domain).
- **JWT Verification:** Admin endpoints (like `/api/v2/admin/ingest`) require a valid Bearer token minted by Supabase, cryptographically verified by the backend middleware before execution.

---

## Development Practices (SDE Standard)

SNA is built adhering to modern Software Development Engineering (SDE) standards to ensure maintainability, testability, and stability.

### 1. Architecture Patterns
- **Repository Pattern:** Database access is abstracted into classes (e.g., `ArticleRepository`). This isolates SQLAlchemy logic from the API routers, making the business logic easily testable via mocked repositories.
- **Strategy Pattern:** The ingestion engine uses a `BaseSourceAdapter` interface, allowing developers to add new news APIs (like Bing News or Bloomberg) by simply implementing a `fetch()` method, satisfying the Open-Closed Principle.
- **Dependency Injection:** FastAPI's `Depends()` is heavily utilized to inject database sessions and configuration into routes, ensuring thread-safe operation and eliminating global state mutations.

### 2. CI/CD & Git Flow
- **Trunk-Based Development:** All features are developed in short-lived feature branches and merged into `v3-native-backend` via Pull Requests.
- **GitHub Actions (CI):** Every PR triggers an automated pipeline that runs `flake8` for Python linting, `tsc` for TypeScript type-checking, and `pytest` for unit tests. A merge is blocked if any check fails.
- **Automated Deployments (CD):** Merging to the main branch automatically triggers Vercel to build and deploy the Next.js frontend, and Railway/AWS to roll out the new FastAPI container image with zero downtime.

### 3. Observability & Telemetry
- **Structured JSON Logging:** Python's `structlog` is used. In production, logs are emitted as JSON, allowing easy ingestion and querying in Datadog or AWS CloudWatch.
- **Prometheus Metrics:** The `/metrics` endpoint exposes RED (Rate, Errors, Duration) metrics. Key performance indicators (like *Article Analysis Latency* and *Groq Token Consumption*) are tracked as Histograms and Counters to trigger automated alerts via Grafana if SLA thresholds are breached.

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
  <sub>Strategic News Analyzer v3.0.0</sub>
</div>
