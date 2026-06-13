from app.ai.ollama_client import ollama_client
from app.ai.groq_client import groq_client
from app.ai.model_router import TaskType, get_model
from app.core.logging import get_logger

logger = get_logger(__name__)

ENTITY_EXTRACTION_SYSTEM_PROMPT = """Extract entities and relationships from the provided news article text.

Rules:
- Only extract entities that are explicitly named in the article
- Only extract relationships that are directly stated, not implied
- Types: Person | Country | Organization | Treaty | Agreement | Concept
- Relation types: leads|member_of|opposes|supports|sanctions|alliance_with|conflict_with|negotiates_with|signed|owns|located_in|accused_of

Respond ONLY with this JSON structure (no markdown, no extra text):
{
  "entities": [
    {"name": "string", "type": "string", "description": "string"}
  ],
  "relations": [
    {"from": "entity_name", "relation": "relation_type", "to": "entity_name", "confidence": 0.0}
  ]
}"""

async def extract_entities(article_id: str, article_text: str) -> dict:
    model, provider = get_model(TaskType.ENTITY_EXTRACTION)

    for attempt in range(2):
        if provider == "groq":
            result = await groq_client.chat_json(
                model=model,
                system=ENTITY_EXTRACTION_SYSTEM_PROMPT,
                user=f"Article Content:\n{article_text[:4000]}",
                max_tokens=1000
            )
        else:
            # Fallback to Ollama client
            prompt = f"{ENTITY_EXTRACTION_SYSTEM_PROMPT}\n\nArticle Content:\n{article_text[:2500]}"
            result = await ollama_client.generate_json(model, prompt)

        # Validate structure
        if (
            isinstance(result, dict)
            and "entities" in result
            and "relations" in result
            and isinstance(result["entities"], list)
        ):
            return result

        logger.warning("entity_extraction_retry", article_id=article_id, attempt=attempt)

    logger.error("entity_extraction_failed", article_id=article_id)
    return {"entities": [], "relations": []}
