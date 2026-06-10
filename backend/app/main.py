from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.api import auth, articles, admin, entities, events, analyst, forecasts

# Include API routers (versioned v2)
app.include_router(auth.router, prefix="/api/v2/auth", tags=["Authentication"])
app.include_router(articles.router, prefix="/api/v2/articles", tags=["Articles"])
app.include_router(admin.router, prefix="/api/v2/admin", tags=["Administration"])
app.include_router(entities.router)
app.include_router(events.router)
app.include_router(analyst.router)
app.include_router(forecasts.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "geopolitical-intelligence-api"}
