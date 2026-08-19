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
    chunks = await hybrid_retrieve(db, question, q_embedding, top_k=10)

    if not chunks:
        return {"answer": "No relevant articles found in the database for this query.",
                "sources": []}

    # 3. Build context with citations using XML-style delimiters to resist prompt injection.
    #    Untrusted article text is clearly bounded so the LLM cannot mistake it for instructions.
    context_parts = []
    for i, c in enumerate(chunks):
        date_str = c['published_at'].date() if c['published_at'] else 'Unknown date'
        context_parts.append(
            f"<source id=\"{i+1}\">\n"
            f"<title>{c['title']}</title>\n"
            f"<date>{date_str}</date>\n"
            f"<outlet>{c['source_name']}</outlet>\n"
            f"<text>{c['chunk_text']}</text>\n"
            f"</source>"
        )
    context = "\n\n".join(context_parts)

    # 4. Generate via Groq
    answer_json = await groq_client.chat_json(
        model="openai/gpt-oss-120b",
        system=RAG_SYSTEM_PROMPT,
        user=f"<retrieved_sources>\n{context}\n</retrieved_sources>\n\n<user_question>\n{question}\n</user_question>",
        max_tokens=1000
    )

    return {
        "answer": answer_json.get("answer", "") if isinstance(answer_json, dict) else str(answer_json),
        "sources": [{"id": str(c['article_id']), "title": c['title'], "url": c['url']} for c in chunks]
    }
