from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def hybrid_retrieve(
    db: AsyncSession,
    query: str,
    query_embedding: list[float],
    top_k: int = 5,
    date_filter_days: int = 90
) -> list[dict]:
    """
    Two-stage retrieval:
    Stage 1: Get top-20 from vector search + top-20 from FTS
    Stage 2: RRF merge -> top-K
    """
    results = await db.execute(text("""
        WITH vector_results AS (
            SELECT ae.article_id, ae.chunk_text, ae.chunk_index,
                   ROW_NUMBER() OVER (ORDER BY ae.embedding <=> :q_embed::vector) AS v_rank
            FROM article_embeddings ae
            JOIN articles a ON a.id = ae.article_id
            WHERE a.published_at > NOW() - (:days || ' days')::INTERVAL
            ORDER BY ae.embedding <=> :q_embed::vector
            LIMIT 20
        ),
        fts_results AS (
            SELECT a.id AS article_id,
                   NULL::text AS chunk_text,
                   0 AS chunk_index,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', :query)) DESC
                   ) AS f_rank
            FROM articles a
            WHERE a.search_vector @@ plainto_tsquery('english', :query)
            AND a.published_at > NOW() - (:days || ' days')::INTERVAL
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
        LIMIT :top_k
    """), {
        "q_embed": query_embedding,
        "query": query,
        "days": str(date_filter_days),
        "top_k": top_k
    })

    return [dict(row._mapping) for row in results]
