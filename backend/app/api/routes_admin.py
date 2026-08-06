from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from .. import database
from ..services.aggregator import Aggregator

router = APIRouter()

def run_ingestion_task(db: Session):
    aggregator = Aggregator(db)
    aggregator.run_ingestion()

@router.post("/fetch-news")
def trigger_ingestion(background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    """
    Manually trigger news ingestion.
    Runs in background.
    """
    # Initialize aggregator to run synchronously for immediate feedback or background
    # Given the requirements, background is better for scale, but for demo IMMEDIATE results might be nicer.
    # But usually fetch-news is long running.
    # Let's run it in background but return a message.
    
    # We need a new session for the background task usually, but here I'll just instantiate the Aggregator inside the task
    # To keep it simple and safe with FastAPI DI, I will make the task function create its own session or pass the parameters needed.
    # Actually, simpler: I'll just run it synchronously for the MVP to ensure user sees results immediately in logs/console,
    # or use BackgroundTasks properly.
    
    # Re-reading: "Manually trigger ingestion".
    # Let's use BackgroundTasks.
    background_tasks.add_task(run_ingestion_task_wrapper)
    return {"message": "News ingestion triggered in background"}

def run_ingestion_task_wrapper():
    # Create a new session for the background task
    db = database.SessionLocal()
    try:
        aggregator = Aggregator(db)
        stats = aggregator.run_ingestion()
        print(f"Background ingestion finished: {stats}")
    finally:
        db.close()

@router.get("/health")
def health_check():
    """
    Backend health check.
    """
    return {"status": "ok"}

@router.get("/debug-db")
def debug_db(db: Session = Depends(database.get_db)):
    """
    Debug endpoint to check DB state.
    """
    from ..config import get_settings
    from .. import models
    settings = get_settings()
    count = db.query(models.NewsArticle).count()
    return {
        "db_url": settings.DATABASE_URL,
        "article_count": count,
        "demo_mode": settings.DEMO_MODE
    }




