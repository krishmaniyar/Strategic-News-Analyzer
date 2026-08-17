import numpy as np
from sklearn.cluster import HDBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json
from app.core.logging import get_logger
from app.ai.groq_client import groq_client  # Using Groq for event generation — qwen2.5:7b
                                             # (~4GB RAM) cannot coexist with nomic-embed-text
                                             # on the 1GB e2-micro VM.

logger = get_logger(__name__)

HDBSCAN_PARAMS = {
    "min_cluster_size": 3,
    "min_samples": 2,
    "metric": "precomputed",
    "cluster_selection_epsilon": 0.15,
}

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

async def get_event_centroid(db: AsyncSession, event_id: str) -> list[float]:
    result = await db.execute(text("SELECT centroid FROM events WHERE id = :event_id"), {"event_id": event_id})
    row = result.fetchone()
    if row and row.centroid is not None:
        if isinstance(row.centroid, str):
            return [float(x) for x in row.centroid.strip("[]").split(",") if x.strip()]
        return list(row.centroid)
    return []

async def find_matching_event(db: AsyncSession, centroid: list[float], threshold: float = 0.85) -> str | None:
    """Find an existing recent event whose centroid is close to this cluster's centroid."""
    result = await db.execute(text("""
        SELECT id
        FROM events
        WHERE centroid IS NOT NULL
        AND last_updated > NOW() - INTERVAL '7 days'
        ORDER BY centroid <=> :centroid::vector
        LIMIT 1
    """), {"centroid": centroid})
    row = result.fetchone()
    if not row:
        return None
    # Verify similarity threshold
    existing_centroid = await get_event_centroid(db, str(row.id))
    if not existing_centroid:
        return None
    sim = cosine_similarity([centroid], [existing_centroid])[0][0]
    return str(row.id) if sim >= threshold else None

async def run_clustering(db: AsyncSession):
    """Fetch unclustered articles and run HDBSCAN."""
    logger.info("clustering_start")

    # Fetch recent articles with their embeddings
    result = await db.execute(text("""
        SELECT a.id, a.title, a.content_raw, ae.embedding
        FROM articles a
        JOIN article_embeddings ae ON a.id = ae.article_id
        WHERE a.published_at > NOW() - INTERVAL '48 hours'
          AND NOT EXISTS (SELECT 1 FROM event_articles ea WHERE ea.article_id = a.id)
    """))
    articles = result.fetchall()

    if len(articles) < HDBSCAN_PARAMS["min_cluster_size"]:
        logger.info("clustering_skip_not_enough_articles", count=len(articles))
        return

    # parse embeddings
    def parse_emb(emb):
        if isinstance(emb, str):
            return [float(x) for x in emb.strip("[]").split(",") if x.strip()]
        return list(emb)

    embeddings = np.array([parse_emb(row.embedding) for row in articles])

    # Compute cosine distance matrix (1 - cosine similarity)
    sim_matrix = cosine_similarity(embeddings)
    dist_matrix = 1.0 - sim_matrix
    np.fill_diagonal(dist_matrix, 0)

    clusterer = HDBSCAN(**HDBSCAN_PARAMS)
    labels = clusterer.fit_predict(dist_matrix)

    unique_labels = set(labels)
    clusters = {label: [] for label in unique_labels if label != -1}

    for idx, label in enumerate(labels):
        if label != -1:
            clusters[label].append(articles[idx])

    for label, cluster_articles in clusters.items():
        if len(cluster_articles) < HDBSCAN_PARAMS["min_cluster_size"]:
            continue

        cluster_embeddings = [parse_emb(art.embedding) for art in cluster_articles]
        centroid = np.mean(cluster_embeddings, axis=0).tolist()

        # Check if matches existing event
        event_id = await find_matching_event(db, centroid)

        if not event_id:
            # Generate new event metadata
            summaries = "\\n".join([f"- {art.title}: {str(art.content_raw)[:200]}" for art in cluster_articles])
            prompt = EVENT_GENERATION_PROMPT.format(article_summaries=summaries)

            gen_result = await groq_client.chat_json(
                model="llama-3.3-70b-versatile",
                system="You are a geopolitical intelligence analyst. Given a set of related news article summaries, generate a concise structured event record.",
                user=prompt,
                max_tokens=400
            )
            if not isinstance(gen_result, dict):
                gen_result = {
                    "title": "New Event",
                    "description": "Auto-generated event",
                    "status": "ongoing",
                    "risk_level": "Medium",
                    "involved_entities": [],
                    "affected_regions": []
                }

            insert_res = await db.execute(text("""
                INSERT INTO events (title, description, status, risk_level, involved_entity_ids, affected_regions, centroid)
                VALUES (:title, :desc, :status, :risk, :entities::jsonb, :regions::jsonb, :centroid::vector)
                RETURNING id
            """), {
                "title": gen_result.get("title", "New Event")[:80],
                "desc": gen_result.get("description", ""),
                "status": gen_result.get("status", "ongoing"),
                "risk": gen_result.get("risk_level", "Medium"),
                "entities": json.dumps(gen_result.get("involved_entities", [])),
                "regions": json.dumps(gen_result.get("affected_regions", [])),
                "centroid": centroid
            })
            event_id = str(insert_res.scalar())
        else:
            # Update existing event centroid
            await db.execute(text("""
                UPDATE events SET centroid = :centroid::vector, last_updated = NOW()
                WHERE id = :event_id
            """), {"centroid": centroid, "event_id": event_id})

        # Link articles to event
        for art in cluster_articles:
            await db.execute(text("""
                INSERT INTO event_articles (event_id, article_id, relevance_score)
                VALUES (:event_id, :article_id, 1.0)
                ON CONFLICT DO NOTHING
            """), {"event_id": event_id, "article_id": art.id})

    await db.commit()
    logger.info("clustering_complete", clusters_found=len(clusters))
