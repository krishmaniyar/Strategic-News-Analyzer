import asyncio
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import timezone as pytz_timezone

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.metrics import ingestion_job_status, ingestion_last_run_duration, ingestion_last_run_articles
from app.api import auth, articles, admin, entities, events, analyst, forecasts, feed, risk_map, analytics

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# APScheduler — runs ingestion in a dedicated background thread
# ─────────────────────────────────────────────────────────────────────────────

# Reference to FastAPI's main asyncio event loop, captured at startup.
# Needed so the background ingestion thread can post WebSocket broadcasts
# back to the correct loop via asyncio.run_coroutine_threadsafe().
_main_loop: asyncio.AbstractEventLoop | None = None

scheduler = BackgroundScheduler(timezone="UTC")


def run_ingestion_job() -> None:
    """Entry point called by APScheduler in its background thread.
    Creates its own asyncio event loop — completely isolated from FastAPI's
    main event loop so Groq/Ollama I/O never blocks API/WebSocket serving.
    """
    logger.info("ingestion_job_thread_started")
    ingestion_job_status.set(1)  # 1 = running
    start = datetime.utcnow()
    try:
        asyncio.run(_ingestion_entrypoint())
        duration = (datetime.utcnow() - start).total_seconds()
        ingestion_last_run_duration.set(duration)
        ingestion_job_status.set(0)  # 0 = idle
        logger.info("ingestion_job_thread_complete", duration_seconds=duration)
    except Exception as e:
        ingestion_job_status.set(2)  # 2 = failed
        logger.error("ingestion_job_thread_failed", error=str(e))


async def _ingestion_entrypoint() -> None:
    """Async ingestion pipeline — runs inside the background thread's own event loop."""
    from app.core.database import SessionLocal
    from app.ingestion.coordinator import IngestionCoordinator
    from app.agents.clustering_agent import run_clustering
    from app.ai.groq_client import groq_client

    async with SessionLocal() as db:
        # Restore today's Groq token count from Postgres before running
        await groq_client.restore_budget_from_db(db)

        coordinator = IngestionCoordinator(db, main_loop=_main_loop)
        stats = await coordinator.run_pipeline()

        # Update article count metric
        ingestion_last_run_articles.set(stats.get("total_inserted", 0))

        # Run HDBSCAN event clustering after all articles are processed.
        # This was dead code before (never called); now wired in.
        # Runs in this same background thread — CPU-bound sklearn stays off
        # the FastAPI event loop.
        logger.info("clustering_phase_start")
        await run_clustering(db)

        # Flush today's Groq token usage to Postgres for persistence across restarts
        await groq_client.flush_budget_to_db(db)


# Schedule the daily ingestion job.
# 18:30 UTC == 00:00 IST (UTC+5:30). Do NOT change this without recalculating:
#   IST midnight = 00:00 IST = 24:00 - 5:30 = 18:30 UTC previous day.
scheduler.add_job(
    run_ingestion_job,
    trigger=CronTrigger(hour=18, minute=30),
    id="daily_ingestion",
    max_instances=1,         # Hard guarantee against overlapping runs — replaces the Redis lock.
    coalesce=True,           # If VM was down at trigger time, run once on recovery (not once per missed day).
    misfire_grace_time=3600, # Allow up to 1hr late start if process was mid-restart at trigger time.
)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop
    setup_logging()

    # Capture the main event loop reference BEFORE any background threads start
    _main_loop = asyncio.get_running_loop()

    scheduler.start()

    # Log next run time in IST so operators can confirm the schedule at a glance
    ist = pytz_timezone("Asia/Kolkata")
    job = scheduler.get_job("daily_ingestion")
    next_run_ist = job.next_run_time.astimezone(ist) if job and job.next_run_time else "unknown"
    logger.info(
        "app_starting",
        environment=settings.environment,
        scheduler="APScheduler/BackgroundScheduler",
        next_ingestion_ist=str(next_run_ist),   # Should read ~00:00 IST
    )

    ingestion_job_status.set(0)  # idle on startup
    yield

    scheduler.shutdown(wait=False)
    logger.info("app_shutdown")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Strategic News Analyzer API",
    description="Geopolitical Intelligence Platform — AI-powered analysis engine",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if isinstance(settings.cors_origins, list):
    origins.extend(settings.cors_origins)
elif settings.cors_origins:
    origins.append(settings.cors_origins)

origins = list(set(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics at GET /metrics
Instrumentator().instrument(app).expose(app)

# API routers
app.include_router(auth.router, prefix="/api/v2/auth", tags=["Authentication"])
app.include_router(articles.router, prefix="/api/v2/articles", tags=["Articles"])
app.include_router(admin.router)   # Admin routes define their own prefixes
app.include_router(entities.router)
app.include_router(events.router)
app.include_router(analyst.router)
app.include_router(forecasts.router)
app.include_router(feed.router)
app.include_router(risk_map.router)
app.include_router(analytics.router)


@app.get("/health", tags=["Health"])
async def health_check():
    from app.core.database import engine
    from sqlalchemy import text
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    job = scheduler.get_job("daily_ingestion")
    ist = pytz_timezone("Asia/Kolkata")
    next_run = str(job.next_run_time.astimezone(ist)) if job and job.next_run_time else "unknown"

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": "3.0.0",
        "service": "geopolitical-intelligence-api",
        "database": "connected" if db_ok else "unreachable",
        "scheduler": "running" if scheduler.running else "stopped",
        "next_ingestion_ist": next_run,
    }
