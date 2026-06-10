import json
from app.ai.ollama_client import ollama_client
from app.core.logging import get_logger

logger = get_logger(__name__)

ENTITY_EXTRACTION_PROMPT = """Extract entities and relationships from this news article.

Article: {article_text}

Rules:
- Only extract entities that are explicitly named in the article
- Only extract relationships that are directly stated, not implied
- Types: Person | Country | Organization | Treaty | Agreement | Concept
- Relation types: leads|member_of|opposes|supports|sanctions|alliance_with|conflict_with|negotiates_with|signed|owns|located_in|accused_of

Respond ONLY with this JSON (no markdown, no extra text):
{{
  "entities": [
    {{"name": "string", "type": "string", "description": "string"}}
  ],
  "relations": [
    {{"from": "entity_name", "relation": "relation_type", "to": "entity_name", "confidence": 0.0}}
  ]
}}"""

async def extract_entities(article_id: str, article_text: str) -> dict:
    prompt = ENTITY_EXTRACTION_PROMPT.format(
        article_text=article_text[:2500]
    )

    for attempt in range(2):
        result = await ollama_client.generate_json("qwen2.5:7b", prompt)

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
