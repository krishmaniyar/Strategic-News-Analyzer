from app.services.news_fetcher import NewsFetcher
from app.config import get_settings
import json

settings = get_settings()
print(f"Demo Mode: {settings.DEMO_MODE}")

fetcher = NewsFetcher()
try:
    articles = fetcher.fetch_all()
    print(f"Fetched {len(articles)} articles.")
    for a in articles:
        print(f"- {a['title']}")
except Exception as e:
    print(f"Error: {e}")
