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
    # Format list[float] to string representation for postgres vector type casting
    q_embed_str = "[" + ",".join(map(str, query_embedding)) + "]" if query_embedding is not None else None

    results = await db.execute(text("""
        WITH vector_results AS (
            SELECT ae.article_id, ae.chunk_text, ae.chunk_index,
                   ROW_NUMBER() OVER (ORDER BY ae.embedding <=> CAST(:q_embed AS vector)) AS v_rank
            FROM article_embeddings ae
            JOIN articles a ON a.id = ae.article_id
            WHERE a.published_at > NOW() - CAST((:days || ' days') AS INTERVAL)
            ORDER BY ae.embedding <=> CAST(:q_embed AS vector)
            LIMIT 20
        ),
        fts_results AS (
            SELECT a.id AS article_id,
                   CAST(NULL AS text) AS chunk_text,
                   0 AS chunk_index,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', :query)) DESC
                   ) AS f_rank
            FROM articles a
            WHERE a.search_vector @@ plainto_tsquery('english', :query)
            AND a.published_at > NOW() - CAST((:days || ' days') AS INTERVAL)
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
        LIMIT 40
    """), {
        "q_embed": q_embed_str,
        "query": query,
        "days": str(date_filter_days)
    })

    rows = results.fetchall()
    
    unique_results = []
    seen_titles = set()
    
    for row in rows:
        d = dict(row._mapping)
        title = d.get('title')
        if title and title not in seen_titles:
            seen_titles.add(title)
            unique_results.append(d)
        if len(unique_results) >= top_k:
            break
            
    return unique_results
