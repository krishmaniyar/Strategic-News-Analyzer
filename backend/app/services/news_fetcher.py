import requests
import json
import os
import logging
from typing import List, Dict, Any
from datetime import datetime
from ..config import get_settings

settings = get_settings()

logger = logging.getLogger("news_fetcher")

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
            logger.info("DEMO MODE: Loading from local file")
            return self.fetch_from_local()

        articles = []
        
        # NewsAPI
        try:
            logger.info("Starting fetch from NewsAPI...")
            fetched = self.fetch_from_newsapi()
            logger.info(f"[NewsAPI] Successfully fetched {len(fetched)} articles.")
            articles.extend(fetched)
        except Exception as e:
            logger.error(f"[NewsAPI] Error fetching: {e}")

        # GNews
        try:
            logger.info("Starting fetch from GNews (Multi-language)...")
            fetched = self.fetch_from_gnews()
            logger.info(f"[GNews] Successfully fetched {len(fetched)} articles.")
            articles.extend(fetched)
        except Exception as e:
            logger.error(f"[GNews] Error fetching: {e}")

        # MediaStack
        try:
            logger.info("Starting fetch from MediaStack...")
            fetched = self.fetch_from_mediastack()
            logger.info(f"[MediaStack] Successfully fetched {len(fetched)} articles.")
            articles.extend(fetched)
        except Exception as e:
            logger.error(f"[MediaStack] Error fetching: {e}")

        logger.info(f"Total articles fetched from all sources: {len(articles)}")
        return articles

    def fetch_from_local(self) -> List[Dict[str, Any]]:
        try:
            base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            file_path = os.path.join(base_path, "news_sample.json")
            
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            normalized = []
            for item in data:
                normalized.append({
                    "title": item.get("title"),
                    "content": item.get("content") or item.get("description"),
                    "source": item.get("source", {}).get("name", "Unknown"),
                    "url": item.get("url"),
                    "published_at": self._parse_date(item.get("publishedAt")),
                    "language": "en",
                    "raw_json": json.dumps(item)
                })
            return normalized
        except Exception as e:
            logger.error(f"Error reading local file: {e}")
            return []

    def fetch_from_newsapi(self) -> List[Dict[str, Any]]:
        if not self.newsapi_key:
            logger.warning("NewsAPI key not set, skipping.")
            return []

        normalized = []
        countries = ['us', 'in']
        
        for country in countries:
            try:
                url = "https://newsapi.org/v2/top-headlines"
                params = {
                    "country": country,
                    "apiKey": self.newsapi_key,
                }
                response = requests.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                for item in data.get("articles", []):
                    title = item.get("title")
                    source_name = item.get("source", {}).get("name", "NewsAPI")
                    logger.info(f"[NewsAPI:{country}] Found article: {title[:50]}... (Source: {source_name})")
                    
                    normalized.append({
                        "title": title,
                        "content": item.get("content") or item.get("description"),
                        "source": source_name,
                        "url": item.get("url"),
                        "published_at": self._parse_date(item.get("publishedAt")),
                        "language": "en", # NewsAPI usually returns English for 'in' too, but could vary. 
                        # We'll rely on our pipeline detection for accuracy.
                        "raw_json": json.dumps(item)
                    })
            except Exception as e:
                logger.error(f"[NewsAPI:{country}] Error fetching: {e}")
                continue

        return normalized

    def fetch_from_gnews(self) -> List[Dict[str, Any]]:
        if not self.gnews_key:
            logger.warning("GNews key not set, skipping.")
            return []

        languages = ['en', 'hi', 'fr', 'de', 'es', 'zh', 'ru', 'ar']
        normalized = []
        url = "https://gnews.io/api/v4/search"

        for lang in languages:
            try:
                logger.info(f"[GNews] Fetching for language: {lang}")
                params = {
                    "token": self.gnews_key,
                    "lang": lang,
                    "q": "news", # Required for search endpoint
                    "max": 10,  # As requested in the format
                    "sortby": "publishedAt"
                }
                response = requests.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                articles_found = data.get("articles", [])
                logger.info(f"[GNews:{lang}] Found {len(articles_found)} articles.")
                
                for item in articles_found:
                    title = item.get("title")
                    logger.info(f"[GNews:{lang}] Article: {title[:50]}...")
                    
                    normalized.append({
                        "title": title,
                        "content": item.get("content") or item.get("description"),
                        "source": item.get("source", {}).get("name", "GNews"),
                        "url": item.get("url"),
                        "published_at": self._parse_date(item.get("publishedAt")),
                        "language": lang,
                        "raw_json": json.dumps(item)
                    })
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 403:
                    logger.warning(f"[GNews:{lang}] 403 Forbidden: Check API Key validity or Plan Quota.")
                else:
                    logger.error(f"[GNews:{lang}] HTTP error: {e}")
                continue
            except Exception as e:
                 logger.error(f"[GNews:{lang}] Error fetching: {e}")
                 continue

        return normalized

    def fetch_from_mediastack(self) -> List[Dict[str, Any]]:
        if not self.mediastack_key:
            logger.warning("MediaStack key not set, skipping.")
            return []

        url = "http://api.mediastack.com/v1/news"
        params = {
            "access_key": self.mediastack_key,
            "languages": "en,hi", # Added hi
            "countries": "us,in",
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        normalized = []
        for item in data.get("data", []):
            title = item.get("title")
            logger.info(f"[MediaStack] Found article: {title[:50]}...")
            
            normalized.append({
                "title": title,
                "content": item.get("content") or item.get("description"),
                "source": item.get("source", "MediaStack"),
                "url": item.get("url"),
                "published_at": self._parse_date(item.get("published_at")),
                "language": item.get("language", "en"),
                "raw_json": json.dumps(item)
            })
        return normalized

    def _parse_date(self, date_str: str) -> datetime:
        if not date_str:
            return datetime.utcnow()
        try:
            # Handle ISO 8601 basic format
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            return datetime.utcnow()
