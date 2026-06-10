from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "geopolitical",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.agents.analysis_agent",
        "app.agents.embedding_agent",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,                        # Don't ack until task completes
    worker_prefetch_multiplier=1,               # One task at a time per worker
    task_reject_on_worker_lost=True,            # Re-queue if worker dies
    task_track_started=True,
    result_expires=3600,                        # Results expire in 1 hour
)

# Scheduled beat tasks
celery_app.conf.beat_schedule = {
    "ingest-news-every-15min": {
        "task": "agents.run_ingestion",
        "schedule": 15 * 60,                   # seconds
    }
}
