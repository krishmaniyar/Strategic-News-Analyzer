import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.logging import get_logger
from app.ai.groq_client import groq_client
from app.ai.ollama_client import ollama_client
from app.rag.retriever import hybrid_retrieve

logger = get_logger(__name__)

FORECAST_PROMPT = """You are a senior geopolitical analyst producing an intelligence forecast.

## Current Event
{event_title}: {event_description}
Risk: {risk_level}

## Recent Context (last 30 days from our database)
{rag_context}

Step through your reasoning, then provide:

{{
  "topic": "string",
  "prediction": "<Specific, falsifiable statement — e.g. 'China will impose additional tariffs on US semiconductors within 60 days'>",
  "confidence": <0.0-1.0>,
  "timeframe": "string",
  "risk_level": "string",
  "key_scenarios": [{{"scenario":"string","probability":0.0,"triggers":["string"]}}],
  "key_risks": ["string"],
  "evidence_summary": "string",
  "chain_of_thought": "string"
}}"""

async def generate_forecast(db: AsyncSession, event_id: str) -> dict | None:
    logger.info("forecast_generation_start", event_id=event_id)
    # Fetch event details
    result = await db.execute(text("SELECT title, description, risk_level FROM events WHERE id = :event_id"), {"event_id": event_id})
    event = result.fetchone()
    if not event:
        return None

    # Get RAG context directly via hybrid_retrieve to avoid a double Groq call.
    # Previously rag_query() was called here, which internally called Groq a second time
    # to summarize the retrieved chunks — doubling token cost per forecast.
    query = f"What are the recent developments and potential future actions regarding: {event.title}?"
    q_embedding = await ollama_client.embed(query)
    chunks = await hybrid_retrieve(db, query, q_embedding, top_k=5)
    sources = [{"id": str(c['article_id']), "title": c['title'], "url": c['url']} for c in chunks]
    rag_context = "\n\n---\n\n".join([
        f"[{i+1}] {c['title']} ({c['published_at'].date() if c['published_at'] else 'Unknown date'}, {c['source_name']}):\n{c['chunk_text']}"
        for i, c in enumerate(chunks)
    ]) if chunks else "No recent context available."

    prompt = FORECAST_PROMPT.format(
        event_title=event.title,
        event_description=event.description or "",
        risk_level=event.risk_level or "Unknown",
        rag_context=rag_context
    )

    forecast_json = await groq_client.chat_json(
        model="openai/gpt-oss-120b",
        system=prompt,
        user="Generate the forecast JSON based on the context.",
        max_tokens=2000
    )

    if not isinstance(forecast_json, dict) or "prediction" not in forecast_json:
        logger.error("forecast_generation_failed", event_id=event_id)
        return None

    # Save forecast
    insert_res = await db.execute(text("""
        INSERT INTO forecasts (event_id, topic, prediction, confidence, timeframe, risk_level, key_scenarios, key_risks, evidence_summary, chain_of_thought)
        VALUES (:event_id, :topic, :prediction, :confidence, :timeframe, :risk_level, CAST(:key_scenarios AS jsonb), CAST(:key_risks AS jsonb), :evidence_summary, :chain_of_thought)
        RETURNING id
    """), {
        "event_id": event_id,
        "topic": forecast_json.get("topic", event.title),
        "prediction": forecast_json.get("prediction", ""),
        "confidence": float(forecast_json.get("confidence", 0.5)),
        "timeframe": forecast_json.get("timeframe", ""),
        "risk_level": forecast_json.get("risk_level", event.risk_level),
        "key_scenarios": json.dumps(forecast_json.get("key_scenarios", [])),
        "key_risks": json.dumps(forecast_json.get("key_risks", [])),
        "evidence_summary": forecast_json.get("evidence_summary", ""),
        "chain_of_thought": forecast_json.get("chain_of_thought", "")
    })

    forecast_id = str(insert_res.scalar())

    # Optionally save evidence links
    for source in sources:
        await db.execute(text("""
            INSERT INTO forecast_evidence (forecast_id, article_id)
            VALUES (:forecast_id, :article_id)
            ON CONFLICT DO NOTHING
        """), {"forecast_id": forecast_id, "article_id": source["id"]})

    await db.commit()
    logger.info("forecast_generation_success", event_id=event_id, forecast_id=forecast_id)

    return forecast_json
