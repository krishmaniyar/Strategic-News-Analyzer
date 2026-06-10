from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.ingestion.coordinator import IngestionCoordinator

router = APIRouter()

@router.post("/ingest")
async def trigger_ingestion(db: AsyncSession = Depends(get_db)):
    """Trigger news aggregation and ingestion across all active source adapters."""
    coordinator = IngestionCoordinator(db)
    stats = await coordinator.run_pipeline()
    return {
        "status": "success",
        "message": "Ingestion pipeline run completed successfully.",
        "stats": stats
    }
