import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database import SessionLocal, engine, Base
from backend.app.models import NewsArticle
from backend.app.ai.pipeline import run_ai_pipeline
from backend.app.ai import load_all_models
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_ai():
    print("1. Creating Database...")
    Base.metadata.create_all(bind=engine)
    
    print("2. Loading AI Models (this may take a while)...")
    load_all_models()
    
    print("3. Inserting Dummy Article...")
    db = SessionLocal()
    try:
        # Check if exists
        existing = db.query(NewsArticle).filter_by(url="http://test.com/ai-test").first()
        if not existing:
            article = NewsArticle(
                title="Global tensions rise as trade war escalates",
                content="Recent tariffs have sparked fears of a global trade war. Military spending is increasing in response to perceived threats. Analysts warn of severe economic consequences.",
                source="test_source",
                url="http://test.com/ai-test",
                hash_id="1234567890",
                language="en"
            )
            db.add(article)
            db.commit()
            print("   Article inserted.")
        else:
            print("   Article already exists.")
            # Reset processed status
            existing.ai_processed = False
            db.commit()

        print("4. Running AI Pipeline...")
        result = run_ai_pipeline(db)
        print(f"   Pipeline Result: {result}")

        print("5. Verifying Results...")
        article = db.query(NewsArticle).filter_by(url="http://test.com/ai-test").first()
        
        print(f"   Translated Text: {article.translated_text[:50] if article.translated_text else 'N/A'}")
        print(f"   Sentiment: {article.sentiment_label} ({article.sentiment_score})")
        print(f"   Bias: {article.bias_label} ({article.bias_score})")
        print(f"   Strategic Score: {article.strategic_score}")
        print(f"   Processed: {article.ai_processed}")

        if article.ai_processed and article.strategic_score is not None:
            print("✅ Verification SUCCESS!")
        else:
            print("❌ Verification FAILED.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_ai()
