-- Migration 001: Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- Migration 002: Sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    base_url TEXT,
    country TEXT,
    bias_rating TEXT,
    credibility_score REAL DEFAULT 0.7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 003: Articles table
CREATE TABLE IF NOT EXISTS articles (
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
CREATE UNIQUE INDEX IF NOT EXISTS articles_hash_id_idx ON articles (hash_id);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS articles_source_id_idx ON articles (source_id);
CREATE INDEX IF NOT EXISTS articles_is_processed_idx ON articles (is_processed);
CREATE INDEX IF NOT EXISTS articles_search_vector_idx ON articles USING GIN (search_vector);

-- Migration 004: Article analysis
CREATE TABLE IF NOT EXISTS article_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE UNIQUE,
    sentiment_label TEXT,
    sentiment_score REAL,
    bias_label TEXT,
    bias_score REAL,
    strategic_score REAL,
    risk_level TEXT,
    summary TEXT,
    translated_title TEXT,
    translated_content TEXT,
    original_language TEXT,
    key_drivers JSONB DEFAULT '[]',
    affected_regions JSONB DEFAULT '[]',
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS article_analysis_article_id_idx ON article_analysis (article_id);
CREATE INDEX IF NOT EXISTS article_analysis_strategic_score_idx ON article_analysis (strategic_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS article_analysis_risk_level_idx ON article_analysis (risk_level);

-- Migration 005: Embeddings (pgvector)
CREATE TABLE IF NOT EXISTS article_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(768) NOT NULL,
    model TEXT DEFAULT 'nomic-embed-text',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (article_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS article_embeddings_hnsw_idx ON article_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- Migration 006: Events
CREATE TABLE IF NOT EXISTS events (
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
CREATE INDEX IF NOT EXISTS events_risk_level_idx ON events (risk_level);
CREATE INDEX IF NOT EXISTS events_last_updated_idx ON events (last_updated DESC);

CREATE TABLE IF NOT EXISTS event_articles (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    relevance_score REAL,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, article_id)
);
CREATE INDEX IF NOT EXISTS event_articles_event_id_idx ON event_articles (event_id);
CREATE INDEX IF NOT EXISTS event_articles_article_id_idx ON event_articles (article_id);

-- Migration 007: Knowledge Graph
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,                 -- Person|Country|Organization|Treaty|Concept
    description TEXT,
    global_risk_score REAL DEFAULT 0.0,
    mention_count INTEGER DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, type)
);
CREATE INDEX IF NOT EXISTS entities_mention_count_idx ON entities (mention_count DESC);
CREATE INDEX IF NOT EXISTS entities_type_idx ON entities (type);

CREATE TABLE IF NOT EXISTS entity_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    to_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 1,
    source_article_ids JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (from_entity_id, to_entity_id, relation_type)
);
CREATE INDEX IF NOT EXISTS entity_relations_from_entity_id_idx ON entity_relations (from_entity_id);
CREATE INDEX IF NOT EXISTS entity_relations_to_entity_id_idx ON entity_relations (to_entity_id);

CREATE TABLE IF NOT EXISTS entity_embeddings (
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE PRIMARY KEY,
    embedding vector(768),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 008: Forecasts
CREATE TABLE IF NOT EXISTS forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    prediction TEXT NOT NULL,
    confidence REAL NOT NULL,
    timeframe TEXT,
    risk_level TEXT,
    key_scenarios JSONB DEFAULT '[]',
    key_risks JSONB DEFAULT '[]',
    evidence_summary TEXT,
    chain_of_thought TEXT,
    outcome_occurred BOOLEAN,
    brier_score REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS forecasts_expires_at_idx ON forecasts (expires_at);
CREATE INDEX IF NOT EXISTS forecasts_confidence_idx ON forecasts (confidence DESC);

CREATE TABLE IF NOT EXISTS forecast_evidence (
    forecast_id UUID REFERENCES forecasts(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    relevance_note TEXT,
    PRIMARY KEY (forecast_id, article_id)
);

-- Migration 009: Watchlists and Alerts
CREATE TABLE IF NOT EXISTS watchlists (
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
CREATE INDEX IF NOT EXISTS watchlists_user_id_idx ON watchlists (user_id);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    trigger_reason TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alerts_watchlist_id_read_created_idx ON alerts (watchlist_id, is_read, created_at DESC);

-- Migration 010: Row-Level Security (Only create policies if they do not exist)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Articles viewable by all authenticated users" ON articles;
CREATE POLICY "Articles viewable by all authenticated users"
    ON articles FOR SELECT USING (true);  -- Modified for simple portfolio access, auth verification remains on api layer

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own watchlists" ON watchlists;
CREATE POLICY "Users see own watchlists"
    ON watchlists FOR ALL USING (auth.uid() = user_id);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own alerts" ON alerts;
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
    ('GDELT', 'https://www.gdeltproject.org', 'US', 0.7)
ON CONFLICT (name) DO UPDATE SET
    base_url = EXCLUDED.base_url,
    country = EXCLUDED.country,
    credibility_score = EXCLUDED.credibility_score;
