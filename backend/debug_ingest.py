from app.database import SessionLocal, engine, Base
from app.services.aggregator import Aggregator
from app.models import NewsArticle
import logging

logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

db = SessionLocal()

print("Clearing database...")
try:
    db.query(NewsArticle).delete()
    db.commit()
    print("Database cleared.")
except Exception as e:
    print(f"Error clearing DB: {e}")
    db.rollback()

print("Running aggregator manually...")
aggregator = Aggregator(db)
try:
    stats = aggregator.run_ingestion()
    print(f"Ingestion result: {stats}")
except Exception as e:
    print(f"Ingestion failed: {e}")

print("Verifying content...")
count = db.query(NewsArticle).count()
print(f"Final article count: {count}")

db.close()