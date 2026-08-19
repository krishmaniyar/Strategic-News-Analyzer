from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/api/v2/analytics", tags=["Analytics"])

@router.get("/stats")
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    """Return total counts for the analytics dashboard."""
    articles_count = await db.execute(text("SELECT COUNT(id) FROM articles"))
    events_count = await db.execute(text("SELECT COUNT(id) FROM events"))
    entities_count = await db.execute(text("SELECT COUNT(id) FROM entities"))
    forecasts_count = await db.execute(text("SELECT COUNT(id) FROM forecasts"))

    return {
        "articles": articles_count.scalar() or 0,
        "events": events_count.scalar() or 0,
        "entities": entities_count.scalar() or 0,
        "forecasts": forecasts_count.scalar() or 0
    }

@router.get("/charts")
async def get_analytics_charts(db: AsyncSession = Depends(get_db)):
    """Return real chart data for the analytics page."""
    # 1. Risk Distribution Pie (from ArticleAnalysis)
    pie_query = await db.execute(text("""
        SELECT risk_level as name, COUNT(id) as value
        FROM article_analysis
        WHERE risk_level IS NOT NULL
        GROUP BY risk_level
    """))
    pie_data = []
    color_map = {"Critical": "#ef4444", "High": "#f97316", "Medium": "#f59e0b", "Low": "#10b981"}
    for row in pie_query:
        name = row[0]
        value = row[1]
        pie_data.append({
            "name": name,
            "value": value,
            "color": color_map.get(name, "#888888")
        })

    # 2. Monthly Trends (from ArticleAnalysis joined with Articles)
    # Group by YEAR + MONTH to avoid collapsing data across multiple calendar years.
    monthly_query = await db.execute(text("""
        SELECT 
            TO_CHAR(a.published_at, 'Mon YY') as month,
            EXTRACT(YEAR FROM a.published_at) as year_num,
            EXTRACT(MONTH FROM a.published_at) as month_num,
            COUNT(a.id) as articles,
            AVG(aa.strategic_score) as risk,
            AVG(aa.sentiment_score * 100) as sentiment
        FROM articles a
        JOIN article_analysis aa ON a.id = aa.article_id
        WHERE a.published_at IS NOT NULL
        GROUP BY TO_CHAR(a.published_at, 'Mon YY'), EXTRACT(YEAR FROM a.published_at), EXTRACT(MONTH FROM a.published_at)
        ORDER BY year_num ASC, month_num ASC
        LIMIT 12
    """))
    
    monthly_data = []
    for row in monthly_query:
        monthly_data.append({
            "month": row[0],
            "articles": int(row[2]),
            "risk": int(row[3]) if row[3] else 0,
            "sentiment": int(row[4]) if row[4] else 0
        })

    return {
        "risk_pie": pie_data,
        "monthly": monthly_data
    }
