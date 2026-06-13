from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.db.repositories.entity_repo import get_entity_subgraph

router = APIRouter(prefix="/api/v2/entities", tags=["Entities"])

@router.get("")
async def list_entities(
    limit: int = Query(50, ge=1),
    db: AsyncSession = Depends(get_db)
):
    """List most frequently mentioned entities."""
    result = await db.execute(
        text("SELECT id, name, type, mention_count, global_risk_score FROM entities ORDER BY mention_count DESC LIMIT :limit"),
        {"limit": limit}
    )
    return [dict(row._mapping) for row in result]

@router.get("/{entity_id}/graph")
async def get_entity_graph(
    entity_id: str,
    hops: int = Query(1, ge=1, le=3),
    db: AsyncSession = Depends(get_db)
):
    """Get knowledge graph subgraph around a specific entity."""
    try:
        subgraph = await get_entity_subgraph(db, entity_id, hops)
        return subgraph
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
