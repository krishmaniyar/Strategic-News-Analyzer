from sqlalchemy.orm import Session
from .. import crud
from ..utils import hash_utils

class Deduplicator:
    def __init__(self, db: Session):
        self.db = db

    def is_duplicate(self, title: str, url: str) -> bool:
        """
        Check if an article with the same title+url hash already exists.
        """
        hash_id = hash_utils.generate_news_hash(title, url)
        existing_article = crud.get_article_by_hash(self.db, hash_id)
        return existing_article is not None
