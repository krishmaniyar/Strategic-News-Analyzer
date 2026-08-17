from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import verify_token

logger = get_logger(__name__)

router = APIRouter()
_bearer = HTTPBearer()


def _fire_ingestion_job() -> dict:
    """Fires the APScheduler ingestion job for immediate execution.
    Returns status dict. Does NOT block — the job runs in its thread.
    """
    from app.main import scheduler
    job = scheduler.get_job("daily_ingestion")
    if not job:
        raise HTTPException(status_code=503, detail="Scheduler not running or job not registered")

    # Schedule for immediate execution by setting next_run_time to now
    job.modify(next_run_time=datetime.now(tz=timezone.utc))
    logger.info("ingestion_job_manually_triggered")
    return {
        "status": "triggered",
        "message": "Ingestion job queued for immediate execution in background thread. "
                   "Check /metrics or logs for progress.",
    }


@router.post(
    "/internal/trigger-ingestion",
    tags=["Internal"],
    summary="Trigger ingestion job (static bearer token auth)"
)
async def trigger_ingestion_internal(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer)
):
    """Fire the daily ingestion job on-demand. Protected by a static bearer token
    (INTERNAL_TRIGGER_TOKEN env var). Returns immediately — job runs in background.

    Intended for:
    - Manual testing during development
    - Cloud Scheduler or external cron calling this endpoint
    - Verifying fix after a failed run

    This endpoint does NOT block the event loop — it only modifies the APScheduler
    job's next_run_time and returns. The job executes in its own OS thread.
    """
    if not settings.internal_trigger_token:
        raise HTTPException(status_code=503, detail="INTERNAL_TRIGGER_TOKEN not configured on this server")
    if credentials.credentials != settings.internal_trigger_token:
        raise HTTPException(status_code=403, detail="Invalid trigger token")
    return _fire_ingestion_job()


@router.post(
    "/api/v2/admin/trigger-ingestion",
    tags=["Administration"],
    summary="Trigger ingestion job (Supabase JWT auth)"
)
async def trigger_ingestion_admin(user: dict = Depends(verify_token)):
    """Admin-facing trigger that uses Supabase JWT auth (same as other /api/v2 routes).
    Returns immediately — job runs in background thread.
    """
    logger.info("ingestion_job_admin_triggered", user_id=user.get("id"))
    return _fire_ingestion_job()


@router.get(
    "/api/v2/admin/ingestion-status",
    tags=["Administration"],
    summary="Get current ingestion job status"
)
async def ingestion_status(user: dict = Depends(verify_token)):
    """Returns the scheduler state and next scheduled run time."""
    from app.main import scheduler
    from pytz import timezone as pytz_timezone
    ist = pytz_timezone("Asia/Kolkata")
    job = scheduler.get_job("daily_ingestion")
    next_run = None
    if job and job.next_run_time:
        next_run = str(job.next_run_time.astimezone(ist))
    return {
        "scheduler_running": scheduler.running,
        "job_registered": job is not None,
        "next_run_ist": next_run,
    }
