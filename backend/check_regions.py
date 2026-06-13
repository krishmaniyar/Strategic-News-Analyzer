"""Quick script to inspect affected_regions and risk_level data in article_analysis."""
import asyncio
from app.core.database import SessionLocal
from sqlalchemy import text

async def main():
    async with SessionLocal() as db:
        # Check affected_regions data
        r = await db.execute(text("""
            SELECT aa.affected_regions, aa.risk_level, aa.sentiment_score, aa.strategic_score, a.title
            FROM article_analysis aa
            JOIN articles a ON a.id = aa.article_id
            WHERE aa.affected_regions IS NOT NULL AND jsonb_array_length(aa.affected_regions) > 0
            LIMIT 15
        """))
        print("=== Articles with affected_regions ===")
        for row in r:
            d = dict(row._mapping)
            print(f"  Title: {d['title'][:60]}")
            print(f"  Regions: {d['affected_regions']}")
            print(f"  Risk: {d['risk_level']}, Sentiment: {d['sentiment_score']}, Strategic: {d['strategic_score']}")
            print()

        # Check entities of type COUNTRY/LOCATION
        r2 = await db.execute(text("""
            SELECT name, type, mention_count, global_risk_score
            FROM entities
            WHERE type IN ('COUNTRY', 'GPE', 'LOC', 'LOCATION', 'Country', 'country', 'Nation', 'STATE')
            ORDER BY mention_count DESC
            LIMIT 20
        """))
        print("\n=== Country/Location Entities ===")
        for row in r2:
            d = dict(row._mapping)
            print(f"  {d['name']} (type={d['type']}, mentions={d['mention_count']}, risk={d['global_risk_score']})")

        # Check total articles and analyses
        total = await db.execute(text("SELECT COUNT(*) FROM articles"))
        total_a = await db.execute(text("SELECT COUNT(*) FROM article_analysis"))
        regions_count = await db.execute(text("SELECT COUNT(*) FROM article_analysis WHERE affected_regions IS NOT NULL AND jsonb_array_length(affected_regions) > 0"))
        print(f"\n=== Totals ===")
        print(f"  Total articles: {total.scalar()}")
        print(f"  Total analyses: {total_a.scalar()}")
        print(f"  Analyses with regions: {regions_count.scalar()}")

        # Check distinct region values
        r3 = await db.execute(text("""
            SELECT DISTINCT jsonb_array_elements_text(affected_regions) as region
            FROM article_analysis
            WHERE affected_regions IS NOT NULL AND jsonb_array_length(affected_regions) > 0
            ORDER BY region
        """))
        print(f"\n=== All Distinct Regions ===")
        for row in r3:
            print(f"  {row[0]}")

asyncio.run(main())
