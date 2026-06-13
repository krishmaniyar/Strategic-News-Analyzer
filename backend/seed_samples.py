import asyncio
from app.core.database import SessionLocal
from sqlalchemy import text
import json
import uuid

async def main():
    print("Seeding sample events, entities, relations, and forecasts...")
    async with SessionLocal() as db:
        # Fetch some article IDs from database
        res = await db.execute(text("SELECT id, title FROM articles LIMIT 10"))
        articles = res.fetchall()
        if not articles:
            print("No articles found in DB to link. Please make sure ingestion has run.")
            return

        article_ids = [str(art.id) for art in articles]

        # 1. Create a sample event: US-Iran Conflict
        event_id_1 = str(uuid.uuid4())
        await db.execute(text("""
            INSERT INTO events (id, title, description, status, risk_level, involved_entity_ids, affected_regions, last_updated)
            VALUES (:id, :title, :description, 'escalating', 'High', CAST(:entities AS jsonb), CAST(:regions AS jsonb), NOW())
            ON CONFLICT DO NOTHING
        """), {
            "id": event_id_1,
            "title": "US-Iran Escalation in the Persian Gulf",
            "description": "Recent military strikes between US forces and Iranian-backed groups have led to heightened tensions and trade disruptions in the Strait of Hormuz.",
            "entities": json.dumps(["United States", "Iran"]),
            "regions": json.dumps(["Middle East", "Persian Gulf"])
        })

        # 2. Create another sample event: Eastern Mediterranean Energy Dispute
        event_id_2 = str(uuid.uuid4())
        await db.execute(text("""
            INSERT INTO events (id, title, description, status, risk_level, involved_entity_ids, affected_regions, last_updated)
            VALUES (:id, :title, :description, 'ongoing', 'Medium', CAST(:entities AS jsonb), CAST(:regions AS jsonb), NOW())
            ON CONFLICT DO NOTHING
        """), {
            "id": event_id_2,
            "title": "Eastern Mediterranean Maritime Boundary Disputes",
            "description": "Greece and Turkey restart discussions regarding maritime boundaries and energy exploration rights in the Aegean Sea.",
            "entities": json.dumps(["Greece", "Turkey", "European Union"]),
            "regions": json.dumps(["Europe", "Mediterranean"])
        })

        # Link articles to events
        for i, art_id in enumerate(article_ids):
            e_id = event_id_1 if i % 2 == 0 else event_id_2
            await db.execute(text("""
                INSERT INTO event_articles (event_id, article_id, relevance_score)
                VALUES (:event_id, :article_id, 0.9)
                ON CONFLICT (event_id, article_id) DO NOTHING
            """), {"event_id": e_id, "article_id": art_id})

        # 3. Insert Entities
        entities_data = [
            ("United States", "Country", "Global superpower involved in Middle East defense operations.", 80.0, 15),
            ("Iran", "Country", "Regional power in the Persian Gulf involved in proxy conflicts.", 75.0, 12),
            ("Turkey", "Country", "Key NATO member negotiating maritime rights.", 45.0, 8),
            ("Greece", "Country", "EU member state contesting energy exploration rights.", 30.0, 7),
            ("European Union", "Organization", "Supranational body supporting maritime law.", 25.0, 5),
            ("Hasan Rouhani", "Person", "Former Iranian official involved in discussions.", 40.0, 2),
            ("Joe Biden", "Person", "US President directing Gulf defense policy.", 60.0, 4)
        ]

        entity_id_map = {}
        for name, etype, desc, risk_score, count in entities_data:
            ent_res = await db.execute(text("""
                INSERT INTO entities (name, type, description, global_risk_score, mention_count)
                VALUES (:name, :type, :desc, :risk, :count)
                ON CONFLICT (name, type) DO UPDATE SET
                    mention_count = EXCLUDED.mention_count,
                    global_risk_score = EXCLUDED.global_risk_score,
                    description = EXCLUDED.description
                RETURNING id
            """), {"name": name, "type": etype, "desc": desc, "risk": risk_score, "count": count})
            entity_id_map[name] = str(ent_res.scalar())

        # 4. Insert Relations
        relations = [
            ("United States", "Iran", "Conflict", 0.9, article_ids[0]),
            ("Iran", "United States", "Retaliation", 0.85, article_ids[0]),
            ("Joe Biden", "United States", "Leader", 1.0, article_ids[0]),
            ("Turkey", "Greece", "Dispute", 0.75, article_ids[1] if len(article_ids) > 1 else article_ids[0]),
            ("Greece", "European Union", "Member", 0.95, article_ids[1] if len(article_ids) > 1 else article_ids[0]),
            ("Turkey", "European Union", "Negotiation", 0.6, article_ids[1] if len(article_ids) > 1 else article_ids[0])
        ]

        for from_name, to_name, rel_type, conf, art_id in relations:
            from_id = entity_id_map[from_name]
            to_id = entity_id_map[to_name]
            await db.execute(text("""
                INSERT INTO entity_relations (from_entity_id, to_entity_id, relation_type, confidence, evidence_count, source_article_ids)
                VALUES (:from_id, :to_id, :rel_type, :conf, 1, CAST(:art_ids AS jsonb))
                ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO UPDATE SET
                    confidence = EXCLUDED.confidence
            """), {
                "from_id": from_id,
                "to_id": to_id,
                "rel_type": rel_type,
                "conf": conf,
                "art_ids": json.dumps([art_id])
            })

        # 5. Insert a Forecast for US-Iran conflict
        forecast_id = str(uuid.uuid4())
        await db.execute(text("""
            INSERT INTO forecasts (id, event_id, topic, prediction, confidence, timeframe, risk_level, key_scenarios, key_risks, evidence_summary, chain_of_thought)
            VALUES (:id, :event_id, :topic, :prediction, :confidence, :timeframe, :risk_level, CAST(:key_scenarios AS jsonb), CAST(:key_risks AS jsonb), :evidence_summary, :chain_of_thought)
            ON CONFLICT DO NOTHING
        """), {
            "id": forecast_id,
            "event_id": event_id_1,
            "topic": "US-Iran Direct Engagement",
            "prediction": "The United States and Iran will agree to a ceasefire and navigation protocol in the Strait of Hormuz within 90 days.",
            "confidence": 0.35,
            "timeframe": "90 Days",
            "risk_level": "High",
            "key_scenarios": json.dumps([
                {"scenario": "De-escalation via backchannel diplomacy", "probability": 0.35, "triggers": ["Oman mediation", "Prisoner swap talks"]},
                {"scenario": "Stalemate with periodic drone exchanges", "probability": 0.50, "triggers": ["Continued sanctions", "Houthis strikes"]},
                {"scenario": "Direct naval conflict in Gulf", "probability": 0.15, "triggers": ["Tanker seizure", "US loss of life"]}
            ]),
            "key_risks": json.dumps([
                "Closure of Strait of Hormuz causing oil price spike above $110/bbl.",
                "Cyber attacks targeting regional critical infrastructure.",
                "Uncontrolled escalation leading to region-wide war."
            ]),
            "evidence_summary": "RAG evidence suggests that both sides are utilizing proxy attacks to negotiate leverage without triggering direct war.",
            "chain_of_thought": "Analyzing historical posturing and current deployment limits. Neither side wants election-year oil shock, limiting escalation path."
        })

        await db.commit()
        print("Sample data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(main())
