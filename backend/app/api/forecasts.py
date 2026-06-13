from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.agents.forecasting_agent import generate_forecast
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/v2/forecasts", tags=["Forecasts"])

class GenerateRequest(BaseModel):
    event_id: str

@router.post("/generate")
async def create_forecast(request: GenerateRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await generate_forecast(db, request.event_id)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to generate forecast")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ResolveRequest(BaseModel):
    occurred: bool

@router.post("/{forecast_id}/resolve")
async def resolve_forecast(forecast_id: str, request: ResolveRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT confidence FROM forecasts WHERE id = :id"), {"id": forecast_id})
    forecast = result.fetchone()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    brier_score = (forecast.confidence - float(request.occurred)) ** 2

    await db.execute(text("""
        UPDATE forecasts SET outcome_occurred = :occurred, brier_score = :brier, resolved_at = :resolved_at
        WHERE id = :id
    """), {"occurred": request.occurred, "brier": brier_score, "resolved_at": datetime.utcnow(), "id": forecast_id})
    await db.commit()

    return {"status": "resolved", "brier_score": brier_score}

@router.get("/")
async def list_forecasts(limit: int = Query(50, ge=1), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT id, event_id, topic, prediction, confidence, timeframe, risk_level, key_scenarios, key_risks, evidence_summary, chain_of_thought, outcome_occurred, brier_score, created_at, expires_at, resolved_at
        FROM forecasts
        ORDER BY created_at DESC
        LIMIT :limit
    """), {"limit": limit})
    return [dict(row._mapping) for row in result]

@router.get("/accuracy")
async def get_accuracy(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT AVG(brier_score) as avg_brier, COUNT(*) as resolved_count
        FROM forecasts
        WHERE resolved_at IS NOT NULL
    """))
    row = result.fetchone()
    return {"average_brier_score": row.avg_brier or 0.0, "resolved_forecasts": row.resolved_count or 0}
