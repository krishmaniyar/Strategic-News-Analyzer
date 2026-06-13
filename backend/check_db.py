import asyncio
from app.core.database import SessionLocal
from sqlalchemy import text

async def main():
    async with SessionLocal() as db:
        res = await db.execute(text("SELECT count(*) FROM articles"))
        print(f"Total articles in DB: {res.scalar()}")

        res = await db.execute(text("SELECT count(*) FROM article_embeddings"))
        print(f"Total embeddings in DB: {res.scalar()}")

        res = await db.execute(text("SELECT count(*) FROM event_articles"))
        print(f"Total event-article associations: {res.scalar()}")

        res = await db.execute(text("SELECT count(*) FROM events"))
        print(f"Total events in DB: {res.scalar()}")

        res = await db.execute(text("SELECT MIN(published_at), MAX(published_at) FROM articles"))
        row = res.fetchone()
        print(f"Article publication range: {row[0]} to {row[1]}")

        res = await db.execute(text("SELECT NOW()"))
        print(f"Database NOW(): {res.scalar()}")

        # Count articles where published_at > NOW() - 48 hours and no event associated
        res = await db.execute(text("""
            SELECT count(*)
            FROM articles a
            JOIN article_embeddings ae ON a.id = ae.article_id
            WHERE a.published_at > NOW() - INTERVAL '48 hours'
              AND NOT EXISTS (SELECT 1 FROM event_articles ea WHERE ea.article_id = a.id)
        """))
        print(f"Unclustered articles in last 48h: {res.scalar()}")

        # Count unclustered articles in all time
        res = await db.execute(text("""
            SELECT count(*)
            FROM articles a
            JOIN article_embeddings ae ON a.id = ae.article_id
            WHERE NOT EXISTS (SELECT 1 FROM event_articles ea WHERE ea.article_id = a.id)
        """))
        print(f"Total unclustered articles all time: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(main())
