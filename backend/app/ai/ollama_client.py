import httpx
import json
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class OllamaClient:
    """Client for local Ollama models.
    - Embeddings: nomic-embed-text (768-dim)
    - Local fallback text generation: qwen2.5:7b
    """

    async def embed(self, text: str) -> list[float]:
        """Embed a single text string. Returns 768-dim float list."""
        batch_results = await self.embed_batch([text])
        return batch_results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple text strings. More efficient than calling embed() in a loop."""
        embeddings = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for text in texts:
                # Truncate prompt if it is extremely long to fit within window
                truncated = text[:4000] if text else "empty"
                try:
                    resp = await client.post(
                        f"{settings.ollama_base_url}/api/embeddings",
                        json={"model": "nomic-embed-text", "prompt": truncated},
                        headers={"Content-Type": "application/json"}
                    )
                    resp.raise_for_status()
                    embeddings.append(resp.json()["embedding"])
                except Exception as e:
                    logger.error("ollama_embed_failed", error=str(e), text_sample=truncated[:50])
                    embeddings.append([0.0] * 768)  # Zero vector as safety fallback
        return embeddings

    async def generate_json(self, model: str, prompt: str) -> dict:
        """Generate structured JSON output from a local model."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": model, "prompt": prompt, "format": "json", "stream": False},
                    headers={"Content-Type": "application/json"}
                )
                resp.raise_for_status()
                response_text = resp.json().get("response", "{}")
                return json.loads(response_text)
            except Exception as e:
                logger.error("ollama_generate_failed", model=model, error=str(e))
                return {}

# Singleton instance
ollama_client = OllamaClient()
