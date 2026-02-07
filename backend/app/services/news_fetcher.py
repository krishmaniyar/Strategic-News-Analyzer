import requests
import json
import os
from typing import List, Dict, Any
from datetime import datetime
from ..config import get_settings

settings = get_settings()

class NewsFetcher:
    def __init__(self):
        self.newsapi_key = settings.NEWSAPI_KEY
        self.gnews_key = settings.GNEWS_KEY
        self.mediastack_key = settings.MEDIASTACK_KEY
        self.demo_mode = settings.DEMO_MODE

    def fetch_all(self) -> List[Dict[str, Any]]:
        """
        Orchestrates fetching from all configured sources.
        """
        if self.demo_mode:
            print("DEMO MODE: Loading from local file")
            return self.fetch_from_local()

        articles = []
        # Error handling is basic here; in production, we'd want more granular logging per source.
        try:
            articles.extend(self.fetch_from_newsapi())
        except Exception as e:
            print(f"Error fetching from NewsAPI: {e}")

        # Add other sources here similarly...
        # try:
        #     articles.extend(self.fetch_from_gnews())
        # except Exception as e: ...

        return articles

    def fetch_from_local(self) -> List[Dict[str, Any]]:
        """
        Loads sample data for demo purposes.
        """
        # Assuming news_sample.json is in the backend root
        # In a real app, use pathlib to find the file relative to this file
        try:
            # Go up two levels from app/services/news_fetcher.py -> backend/
            base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            file_path = os.path.join(base_path, "news_sample.json")
            
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            normalized = []
            for item in data:
                normalized.append({
                    "title": item.get("title"),
                    "content": item.get("description") or item.get("content"), # Fallback
                    "source": item.get("source", {}).get("name", "Unknown"),
                    "url": item.get("url"),
                    "published_at": self._parse_date(item.get("publishedAt")),
                    "language": "en", # Assumption for demo
                    "raw_json": json.dumps(item)
                })
            return normalized
        except FileNotFoundError:
            print("news_sample.json not found.")
            return []

    def fetch_from_newsapi(self) -> List[Dict[str, Any]]:
        if not self.newsapi_key:
            print("NewsAPI key not set, skipping.")
            return []

        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "country": "us",
            "apiKey": self.newsapi_key
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        normalized = []
        for item in data.get("articles", []):
            normalized.append({
                "title": item.get("title"),
                "content": item.get("description"), # NewsAPI often puts summary in description
                "source": item.get("source", {}).get("name"),
                "url": item.get("url"),
                "published_at": self._parse_date(item.get("publishedAt")),
                "language": "en", # Default for US headlines
                "raw_json": json.dumps(item)
            })
        return normalized

    # Placeholders for other APIs
    def fetch_from_gnews(self):
        # Implementation would be similar
        return []

    def fetch_from_mediastack(self):
        # Implementation would be similar
        return []

    def _parse_date(self, date_str: str) -> datetime:
        if not date_str:
            return datetime.utcnow()
        try:
            # Handle ISO 8601 basic format
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            return datetime.utcnow()
