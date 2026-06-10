import os
import asyncio
from dotenv import load_dotenv
from app.core.database import SessionLocal
from app.ingestion.coordinator import IngestionCoordinator

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

async def test_pipeline():
    print("==========================================================")
    print("[RUN] Running Ingestion Pipeline Verification Test")
    print("==========================================================")

    # Initialize SQLAlchemy Session
    async with SessionLocal() as session:
        coordinator = IngestionCoordinator(session)
        
        try:
            print("Fetching articles from adapters (this may take up to 30 seconds)...")
            stats = await coordinator.run_pipeline()
            
            # AI Pipeline Verification on existing unprocessed articles
            from app.db.repositories.article_repo import ArticleRepository
            repo = ArticleRepository(session)
            unprocessed = await repo.get_unprocessed(limit=5)
            if unprocessed:
                print(f"\nFound {len(unprocessed)} unprocessed articles in DB. Running AI pipeline...")
                from app.agents.analysis_agent import analyze_article
                from app.agents.embedding_agent import embed_article
                for art in unprocessed:
                    print(f"  - Analyzing & embedding: {art.title[:60]}")
                    try:
                        await analyze_article(art, repo)
                        await embed_article(art, repo)
                    except Exception as ai_err:
                        print(f"    [ERROR] AI pipeline failed: {ai_err}")
                await session.commit()
            
            print("\n[COMPLETE] Ingestion Pipeline Completed Successfully!")
            print("----------------------------------------------------------")
            print(f"Total Ingestion Duration: {stats.get('duration_seconds', 0.0):.2f} seconds")
            print(f"Total Articles Fetched:   {stats.get('total_fetched', 0)}")
            print(f"Total Articles Inserted:  {stats.get('total_inserted', 0)}")
            print(f"Total Duplicates Skipped: {stats.get('total_duplicates', 0)}")
            print(f"Total Errors Encountered: {stats.get('total_errors', 0)}")
            print("----------------------------------------------------------\n")
            
            # Query and count analysis and embeddings in the DB
            from app.db.models import ArticleAnalysis, ArticleEmbedding
            from sqlalchemy import select, func
            analysis_count = await session.scalar(select(func.count(ArticleAnalysis.id)))
            embedding_count = await session.scalar(select(func.count(ArticleEmbedding.id)))
            
            print("Database Storage Verification:")
            print(f"  - Total Article Analyses stored: {analysis_count}")
            print(f"  - Total Text Embeddings stored:  {embedding_count}")
            print("----------------------------------------------------------\n")
            
            print("Breakdown per Source:")
            for source, s_stats in stats.get("sources", {}).items():
                print(f"  [{source}]:")
                print(f"    - Fetched:   {s_stats.get('fetched', 0)}")
                print(f"    - Inserted:  {s_stats.get('inserted', 0)}")
                print(f"    - Duplicate: {s_stats.get('duplicates', 0)}")
                print(f"    - Errors:    {s_stats.get('errors', 0)}")
                
            print("==========================================================")
            
        except Exception as e:
            print(f"[ERROR] Error during ingestion pipeline test: {e}")
            raise

if __name__ == "__main__":
    # Fix event loop policy on Windows to avoid standard issues
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(test_pipeline())
