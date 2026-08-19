import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.rag.query_engine import rag_query

router = APIRouter(prefix="/api/v2/analyst", tags=["Analyst Interface"])

class QueryRequest(BaseModel):
    question: str

@router.post("/query")
async def process_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """RAG-powered query answering for analysts."""
    try:
        result = await rag_query(db, request.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query_stream")
async def analyst_query_stream(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """SSE Streaming RAG-powered query answering for analysts."""
    from app.rag.retriever import hybrid_retrieve
    from app.ai.ollama_client import ollama_client
    from app.ai.groq_client import groq_client
    STREAMING_SYSTEM_PROMPT = """You are a geopolitical intelligence analyst with access to a
curated database of recent news articles. Answer questions using ONLY the provided context.

Rules:
- Cite sources as [Source 1], [Source 2], etc.
- If the context lacks sufficient information, say so explicitly — never fabricate
- Be analytical: highlight causality, not just facts
- If sources conflict, acknowledge the disagreement
- End with: [Confidence: High/Medium/Low]

IMPORTANT: Respond with pure text using markdown formatting. DO NOT wrap your response in JSON."""

    async def generate():
        try:
            q_embedding = await ollama_client.embed(request.question)
            chunks = await hybrid_retrieve(db, request.question, q_embedding, top_k=10)

            sources = [{"id": str(c['article_id']), "title": c['title'], "url": c['url']} for c in chunks]

            context = "\n\n---\n\n".join([
                f"[Source {i+1}] {c['title']} ({c['published_at'].date() if c['published_at'] else 'Unknown date'}, {c['source_name']})\n{c['chunk_text']}"
                for i, c in enumerate(chunks)
            ])

            prompt = f"Context:\n{context}\n\nQuestion: {request.question}"

            async for chunk in groq_client.stream_chat(
                model="openai/gpt-oss-120b",
                system=STREAMING_SYSTEM_PROMPT,
                user=prompt,
                max_tokens=1000
            ):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            yield f"data: {json.dumps({'type': 'done', 'sources': sources})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
