import httpx
import json
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class OllamaClient:
    """Client for local Ollama models.
    - Embeddings: nomic-embed-text (768-dim)
    - Text generation intentionally removed: now routes through Groq API
      to avoid loading a 4 GB+ LLM on the 1 GB e2-micro VM alongside embeddings.
    """

    async def health_check(self, timeout: float = 5.0) -> bool:
        """Returns True if Ollama is reachable and responsive.
        Call this before starting an embedding batch to fail fast instead of
        hanging on a 15s timeout per chunk if Ollama was OOM-killed.
        """
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                return resp.status_code == 200
        except Exception as e:
            logger.warning("ollama_health_check_failed", error=str(e))
            return False

    async def embed(self, text: str) -> list[float]:
        """Embed a single text string. Returns 768-dim float list."""
        batch_results = await self.embed_batch([text])
        return batch_results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple text strings using a single shared HTTP client.
        Timeout is 15s per chunk (reduced from 60s — nomic-embed-text on a warm
        Ollama responds in < 1s; 15s gives headroom without hanging the ingestion
        thread for a full minute on each chunk if Ollama becomes unresponsive).
        """
        embeddings = []
        # Reuse a single client session across the batch (was creating a new one per chunk)
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            for text in texts:
                # Truncate to fit within model context window (~8192 tokens ≈ 32k chars)
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
                    # Zero vector as safety fallback — downstream cosine similarity will be 0
                    embeddings.append([0.0] * 768)
        return embeddings

    async def generate_json(self, model: str, prompt: str) -> dict:
        """Generate structured JSON output from a local model.
        NOTE: In the v3 native design, text generation (event clustering, entity extraction)
        routes through Groq API. This method is kept for local dev/fallback only.
        """
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
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
