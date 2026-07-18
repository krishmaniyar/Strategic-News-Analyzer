from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.api import auth, articles, admin, entities, events, analyst, forecasts, feed, risk_map

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("app_starting", environment=settings.environment)
    yield
    logger.info("app_shutdown")

app = FastAPI(
    title="Strategic News Analyzer API",
    description="Geopolitical Intelligence Platform — AI-powered analysis engine",
    version="2.0.0",
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

# Ensure uniqueness
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

# Include API routers (versioned v2)
app.include_router(auth.router, prefix="/api/v2/auth", tags=["Authentication"])
app.include_router(articles.router, prefix="/api/v2/articles", tags=["Articles"])
app.include_router(admin.router, prefix="/api/v2/admin", tags=["Administration"])
app.include_router(entities.router)
app.include_router(events.router)
app.include_router(analyst.router)
app.include_router(forecasts.router)
app.include_router(feed.router)
app.include_router(risk_map.router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "geopolitical-intelligence-api", "version": "2.0.0"}
