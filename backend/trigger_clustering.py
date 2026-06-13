import asyncio
from app.core.database import SessionLocal
from app.agents.clustering_agent import run_clustering

async def main():
    print("Initializing clustering run...")
    async with SessionLocal() as db:
        try:
            await run_clustering(db)
            print("Clustering completed successfully!")
        except Exception as e:
            print(f"Error running clustering: {e}")

if __name__ == "__main__":
    asyncio.run(main())
