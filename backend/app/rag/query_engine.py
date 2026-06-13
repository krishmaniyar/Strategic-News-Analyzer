from app.ai.ollama_client import ollama_client
from app.ai.groq_client import groq_client
from app.rag.retriever import hybrid_retrieve
from sqlalchemy.ext.asyncio import AsyncSession

RAG_SYSTEM_PROMPT = """You are a geopolitical intelligence analyst with access to a
curated database of recent news articles. Answer questions using ONLY the provided context.

Rules:
- Cite sources as [Source 1], [Source 2], etc.
- If the context lacks sufficient information, say so explicitly — never fabricate
- Be analytical: highlight causality, not just facts
- If sources conflict, acknowledge the disagreement
- End with: [Confidence: High/Medium/Low]

Respond ONLY with this JSON structure:
{"answer": "<your detailed analysis and answer with citations>"}"""

async def rag_query(db: AsyncSession, question: str) -> dict:
    # 1. Embed question
    q_embedding = await ollama_client.embed(question)

    # 2. Retrieve hybrid results
    chunks = await hybrid_retrieve(db, question, q_embedding, top_k=5)

    if not chunks:
        return {"answer": "No relevant articles found in the database for this query.",
                "sources": []}

    # 3. Build context with citations
    context = "\n\n---\n\n".join([
        f"[Source {i+1}] {c['title']} ({c['published_at'].date() if c['published_at'] else 'Unknown date'}, {c['source_name']})\n{c['chunk_text']}"
        for i, c in enumerate(chunks)
    ])

    # 4. Generate via Groq 70b
    answer_json = await groq_client.chat_json(
        model="llama-3.3-70b-versatile",
        system=RAG_SYSTEM_PROMPT,
        user=f"Context:\n{context}\n\nQuestion: {question}",
        max_tokens=1000
    )

    return {
        "answer": answer_json.get("answer", "") if isinstance(answer_json, dict) else str(answer_json),
        "sources": [{"id": str(c['article_id']), "title": c['title'], "url": c['url']} for c in chunks]
    }
