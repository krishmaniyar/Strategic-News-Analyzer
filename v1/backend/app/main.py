from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import routes_news, routes_admin, routes_ai
from .ai import load_all_models
from .utils.logger import setup_logging
import threading
import logging

# Setup logging immediately
setup_logging()
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Geopolitical News Aggregator Backend",
    description="API for fetching and aggregating geopolitical news.",
    version="1.0.0"
)

# Load AI models on startup in a separate thread to not block server start? 
# Or just block to ensure they are ready? 
# The user said "Load models once at startup".
# Let's use a startup event.
@app.on_event("startup")
def startup_event():
    # Load models in a separate thread so it doesn't timeout the worker if it takes too long
    # But usually for dev server valid to just load.
    # Let's just call it.
    print("Loading AI models...")
    load_all_models()
    print("AI models loaded.")

# CORS
app.add_middleware(
    CORSMiddleware,
    # allow_origins=origins, # Removed in favor of regex
    allow_origin_regex=r"https?://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(routes_news.router, prefix="/api/v1", tags=["news"])
app.include_router(routes_admin.router, prefix="/admin", tags=["admin"])
app.include_router(routes_ai.router, prefix="/api/v1/ai", tags=["ai"])

@app.get("/")
def root():
    return {"message": "Welcome to the Geopolitical News Aggregator API"}
