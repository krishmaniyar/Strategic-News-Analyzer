import json
import threading
from datetime import date, datetime
from groq import AsyncGroq, RateLimitError
import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GroqClient:
    """Wrapper around Groq API with:
    - Daily token budget tracking (thread-safe in-memory counter, flushed to Postgres)
    - Structured JSON output parsing
    - Automatic retry on rate limit (429)
    - Explicit 30s timeout (SDK default is ~600s which can hang the ingestion thread)
    """

    def __init__(self):
        self._client = AsyncGroq(
            api_key=settings.groq_api_key,
            http_client=httpx.AsyncClient(timeout=httpx.Timeout(30.0))
        )
        # Thread-safe in-memory counter. A single process needs no Redis for this.
        self._token_lock = threading.Lock()
        self._in_memory_tokens: int = 0
        self._token_date: date = date.today()

    def _check_budget(self, estimated_tokens: int = 500) -> bool:
        """Return False if daily budget is exceeded. Thread-safe."""
        with self._token_lock:
            # Midnight reset — if the date has changed, start fresh
            if date.today() != self._token_date:
                self._in_memory_tokens = 0
                self._token_date = date.today()
            return (self._in_memory_tokens + estimated_tokens) <= settings.groq_daily_token_budget

    def _increment_budget(self, tokens: int) -> None:
        """Record token consumption. Thread-safe."""
        with self._token_lock:
            self._in_memory_tokens += tokens

    def get_today_usage(self) -> int:
        """Return today's token count (for metrics/logging)."""
        with self._token_lock:
            return self._in_memory_tokens

    async def restore_budget_from_db(self, db) -> None:
        """On startup: restore today's token total from the token_usage_log table.
        Prevents over-spending if the process restarts mid-day.
        """
        try:
            from sqlalchemy import text
            today = date.today()
            result = await db.execute(
                text("SELECT COALESCE(SUM(tokens_used), 0) FROM token_usage_log WHERE run_date = :today"),
                {"today": today}
            )
            row = result.fetchone()
            restored = int(row[0]) if row else 0
            with self._token_lock:
                self._in_memory_tokens = restored
                self._token_date = today
            logger.info("groq_budget_restored", tokens_used_today=restored, date=str(today))
        except Exception as e:
            logger.warning("groq_budget_restore_failed", error=str(e))

    async def flush_budget_to_db(self, db) -> None:
        """At end of ingestion run: persist today's token count to Postgres.
        Uses UPSERT so re-runs during the same day accumulate correctly.
        """
        try:
            from sqlalchemy import text
            today = date.today()
            tokens = self.get_today_usage()
            model_name = "openai/gpt-oss-120b"
            await db.execute(text("""
                INSERT INTO token_usage_log (run_date, model, tokens_used, logged_at)
                VALUES (:today, :model, :tokens, NOW())
                ON CONFLICT (run_date, model)
                DO UPDATE SET tokens_used = token_usage_log.tokens_used + EXCLUDED.tokens_used,
                              logged_at = NOW()
            """), {"today": today, "model": model_name, "tokens": tokens})
            await db.commit()
            logger.info("groq_budget_flushed_to_db", tokens=tokens, date=str(today))
        except Exception as e:
            logger.warning("groq_budget_flush_failed", error=str(e))

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

        if not self._check_budget(max_tokens):
            logger.warning("groq_budget_exceeded", daily_budget=settings.groq_daily_token_budget)
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
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                content = resp.choices[0].message.content

                # Track token usage
                if resp.usage:
                    self._increment_budget(resp.usage.total_tokens)

                return json.loads(content)

            except RateLimitError:
                # Handle Rate Limit (HTTP 429) with typed exception
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning("groq_rate_limited_retrying", attempt=attempt, wait_time=wait_time)
                    import asyncio
                    await asyncio.sleep(wait_time)
                    continue
                logger.error("groq_rate_limit_exhausted", retries=retries)
                return {}

            except Exception as e:
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
        """Stream Groq API response chunk by chunk. Tracks token usage."""
        if not settings.groq_api_key:
            yield ""
            return

        if not self._check_budget(max_tokens):
            yield ""
            return

        total_tokens = 0
        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                max_tokens=max_tokens,
                temperature=0.1,
                stream=True,
                stream_options={"include_usage": True},
            )

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                # Groq sends usage info on the final chunk when stream_options include_usage is set
                if hasattr(chunk, 'usage') and chunk.usage:
                    total_tokens = chunk.usage.total_tokens

        except Exception as e:
            logger.error("groq_stream_failed", error=str(e))
            yield ""
        finally:
            # Always record token usage — fall back to max_tokens estimate if unavailable
            self._increment_budget(total_tokens if total_tokens > 0 else max_tokens)


# Singleton instance — reused across all agents
groq_client = GroqClient()
