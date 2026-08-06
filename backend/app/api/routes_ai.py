from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import NewsArticle
from ..ai.pipeline import run_ai_pipeline
from ..ai import load_all_models
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/process")
def process_articles(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Triggers AI processing for unprocessed articles in the background.
    """
    # Check if there are any unprocessed articles
    count = db.query(NewsArticle).filter(NewsArticle.ai_processed == False).count()
    if count == 0:
        return {"message": "No new articles to process."}

    logger.info(f"Triggering background processing for {count} unprocessed articles.")
    background_tasks.add_task(run_ai_pipeline, db)
    return {"message": "AI processing started in background.", "unprocessed_count": count}

@router.get("/status")
def get_ai_status(db: Session = Depends(get_db)):
    """
    Returns the status of AI processing.
    """
    total = db.query(NewsArticle).count()
    processed = db.query(NewsArticle).filter(NewsArticle.ai_processed == True).count()
    unprocessed = total - processed
    
    return {
        "total_articles": total,
        "processed": processed,
        "unprocessed": unprocessed
    }
