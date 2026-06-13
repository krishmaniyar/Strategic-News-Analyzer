from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def upsert_entity(db: AsyncSession, name: str, type: str, description: str | None) -> str:
    """Insert or update entity. Returns entity UUID."""
    # Use PostgreSQL ON CONFLICT for atomic upsert
    result = await db.execute(
        text("""
        INSERT INTO entities (name, type, description, mention_count, last_seen)
        VALUES (:name, :type, :description, 1, NOW())
        ON CONFLICT (name, type) DO UPDATE SET
            mention_count = entities.mention_count + 1,
            last_seen = NOW(),
            description = COALESCE(EXCLUDED.description, entities.description)
        RETURNING id
        """),
        {"name": name, "type": type, "description": description}
    )
    return str(result.scalar())

async def upsert_relation(
    db: AsyncSession,
    from_id: str, to_id: str, relation_type: str,
    confidence: float, article_id: str
) -> None:
    """Upsert relation with evidence tracking."""
    await db.execute(
        text("""
        INSERT INTO entity_relations
            (from_entity_id, to_entity_id, relation_type, confidence, evidence_count, source_article_ids)
        VALUES (:from_id, :to_id, :relation_type, :confidence, 1, CAST(:source_article_ids AS jsonb))
        ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO UPDATE SET
            evidence_count = entity_relations.evidence_count + 1,
            confidence = (entity_relations.confidence * entity_relations.evidence_count + :confidence)
                        / (entity_relations.evidence_count + 1),
            source_article_ids = entity_relations.source_article_ids || CAST(:source_article_ids AS jsonb),
            updated_at = NOW()
        """),
        {"from_id": from_id, "to_id": to_id, "relation_type": relation_type, "confidence": confidence, "source_article_ids": f'["{article_id}"]'}
    )

async def get_entity_subgraph(db: AsyncSession, entity_id: str, hops: int = 2) -> dict:
    """Recursive CTE traversal. Max hops=3 to prevent huge responses."""
    hops = min(hops, 3)
    nodes = await db.execute(text("""
        WITH RECURSIVE entity_graph AS (
            SELECT e.id, e.name, e.type, e.mention_count, 0 AS depth,
                   ARRAY[CAST(e.id AS text)] AS path
            FROM entities e WHERE e.id = :entity_id
            UNION ALL
            SELECT e2.id, e2.name, e2.type, e2.mention_count, eg.depth + 1,
                   eg.path || CAST(e2.id AS text)
            FROM entity_graph eg
            JOIN entity_relations er ON er.from_entity_id = eg.id
            JOIN entities e2 ON e2.id = er.to_entity_id
            WHERE eg.depth < :hops AND NOT (CAST(e2.id AS text) = ANY(eg.path))
        )
        SELECT DISTINCT id, name, type, mention_count, depth FROM entity_graph
        ORDER BY depth, mention_count DESC LIMIT 100
    """), {"entity_id": entity_id, "hops": hops})

    nodes_list = [dict(row._mapping) for row in nodes]
    node_ids = [str(n["id"]) for n in nodes_list]

    if not node_ids:
        return {"nodes": [], "edges": []}

    edges = await db.execute(text("""
        SELECT er.from_entity_id, er.to_entity_id, er.relation_type, er.confidence
        FROM entity_relations er
        WHERE er.from_entity_id = ANY(:node_ids) OR er.to_entity_id = ANY(:node_ids)
    """), {"node_ids": node_ids})

    return {"nodes": nodes_list, "edges": [dict(row._mapping) for row in edges]}
