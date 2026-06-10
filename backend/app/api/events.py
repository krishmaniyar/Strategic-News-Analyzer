from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/api/v2/events", tags=["Events"])

@router.get("")
async def list_events(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """List recent events."""
    result = await db.execute(text("""
        SELECT id, title, description, status, risk_level, involved_entity_ids, affected_regions, last_updated 
        FROM events 
        ORDER BY last_updated DESC 
        LIMIT :limit
    """), {"limit": limit})
    return [dict(row._mapping) for row in result]
