from app.database import SessionLocal
from app.models import NewsArticle
from app.crud import get_articles
import logging

logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

db = SessionLocal()

print("Testing direct query...")
articles = db.query(NewsArticle).all()
print(f"Direct query count: {len(articles)}")
for a in articles:
    print(f"ID: {a.id}, Title: {a.title}, Published: {a.published_at} (type: {type(a.published_at)})")

print("\nTesting CRUD function...")
try:
    crud_articles = get_articles(db)
    print(f"CRUD function count: {len(crud_articles)}")
except Exception as e:
    print(f"CRUD failed: {e}")

db.close()
