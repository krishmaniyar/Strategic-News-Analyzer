from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import routes_news, routes_admin

# Create tables
Base.metadata.create_all(bind=engine)



app = FastAPI(
    title="Geopolitical News Aggregator Backend",
    description="API for fetching and aggregating geopolitical news.",
    version="1.0.0"
)

# CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(routes_news.router, prefix="/api/v1", tags=["news"])
app.include_router(routes_admin.router, prefix="/admin", tags=["admin"])

@app.get("/")
def root():
    return {"message": "Welcome to the Geopolitical News Aggregator API"}
