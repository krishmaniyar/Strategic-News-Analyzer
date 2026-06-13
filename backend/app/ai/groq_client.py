import asyncio
import json
import redis.asyncio as aioredis
from groq import AsyncGroq
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class GroqClient:
    """Wrapper around Groq API with:
    - Daily token budget tracking (Redis counter with in-memory fallback)
    - Structured JSON output parsing
    - Automatic retry on rate limit (429)
    """

    def __init__(self):
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._redis = None
        self._redis_offline = False
        self._in_memory_tokens = 0

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5
            )
        return self._redis

    async def _check_budget(self, estimated_tokens: int = 500) -> bool:
        """Return False if daily budget is exceeded."""
        if self._redis_offline:
            return (self._in_memory_tokens + estimated_tokens) <= settings.groq_daily_token_budget
        try:
            r = await self._get_redis()
            used = int(await r.get("groq_tokens_today") or 0)
            return (used + estimated_tokens) <= settings.groq_daily_token_budget
        except Exception:
            self._redis_offline = True
            logger.info("redis_offline_falling_back_to_memory")
            return (self._in_memory_tokens + estimated_tokens) <= settings.groq_daily_token_budget

    async def _increment_budget(self, tokens: int):
        """Record token consumption."""
        if self._redis_offline:
            self._in_memory_tokens += tokens
            return
        try:
            r = await self._get_redis()
            await r.incrby("groq_tokens_today", tokens)
            await r.expire("groq_tokens_today", 86400)  # Reset daily
        except Exception:
            self._redis_offline = True
            self._in_memory_tokens += tokens

    async def chat_json(
        self,
        model: str,
        system: str,
        user: str,
        max_tokens: int = 500,
        retries: int = 3
    ) -> dict:
        """Call Groq API and parse JSON response. Returns {} on failure — never raises."""
        if not settings.groq_api_key:
            logger.warning("groq_api_key_missing")
            return {}

        if not await self._check_budget(max_tokens):
            logger.warning("groq_budget_exceeded")
            return {}

        for attempt in range(retries):
            try:
                resp = await self._client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user}
                    ],
                    max_tokens=max_tokens,
                    temperature=0.1,    # Low temp for structured outputs
                    response_format={"type": "json_object"}
                )
                content = resp.choices[0].message.content

                # Track token usage
                if resp.usage:
                    await self._increment_budget(resp.usage.total_tokens)

                return json.loads(content)

            except Exception as e:
                # Handle Rate Limit (HTTP 429)
                if "429" in str(e) and attempt < retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning("groq_rate_limited_retrying", attempt=attempt, wait_time=wait_time)
                    await asyncio.sleep(wait_time)  # Exponential backoff
                    continue

                logger.error("groq_call_failed", error=str(e), attempt=attempt)
                return {}

        return {}

    async def stream_chat(
        self,
        model: str,
        system: str,
        user: str,
        max_tokens: int = 1000
    ):
        """Stream Groq API response chunk by chunk."""
        if not settings.groq_api_key:
            yield ""
            return

        if not await self._check_budget(max_tokens):
            yield ""
            return

        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                max_tokens=max_tokens,
                temperature=0.1,
                stream=True
            )

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error("groq_stream_failed", error=str(e))
            yield ""

# Singleton instance — reused across all agents
groq_client = GroqClient()
