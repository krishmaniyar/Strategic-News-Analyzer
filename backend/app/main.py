from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.api import auth, articles, admin

logger = get_logger(__name__)

# Initialize structured logging configuration
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("application_startup", environment=settings.environment)
    yield
    # Shutdown tasks
    logger.info("application_shutdown")

app = FastAPI(
    title="Geopolitical Intelligence Platform API",
    version="2.0.0",
    description="AI-Powered Geopolitical News Analysis and Forecasting System",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers (versioned v2)
app.include_router(auth.router, prefix="/api/v2/auth", tags=["Authentication"])
app.include_router(articles.router, prefix="/api/v2/articles", tags=["Articles"])
app.include_router(admin.router, prefix="/api/v2/admin", tags=["Administration"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "geopolitical-intelligence-api"}
