"""
pytest conftest.py — shared fixtures and mocks.

All Groq and Ollama API calls are intercepted here so CI
never makes real network requests.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch


# ─── Groq client mock ───────────────────────────────────────────────────────

@pytest.fixture
def mock_groq_chat_json():
    """Mock GroqClient.chat_json to return a fixed sentiment payload."""
    with patch("app.ai.groq_client.GroqClient.chat_json", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "sentiment_label": "Negative",
            "sentiment_score": 0.85,
            "bias_label": "Biased",
            "bias_score": 0.7,
            "strategic_score": 72,
            "risk_level": "High",
            "summary": "Test summary.",
            "key_drivers": ["Geopolitical tension"],
            "affected_regions": ["Eastern Europe"],
            "reasoning": "Unit test mock response.",
        }
        yield mock


@pytest.fixture
def mock_groq_stream():
    """Mock GroqClient.stream_chat to yield fixed token chunks."""
    async def fake_stream(*args, **kwargs):
        for token in ["The", " situation", " is", " escalating."]:
            yield token

    with patch("app.ai.groq_client.GroqClient.stream_chat", side_effect=fake_stream):
        yield


# ─── Ollama client mock ──────────────────────────────────────────────────────

@pytest.fixture
def mock_ollama_embed():
    """Mock OllamaClient.embed to return a fixed 768-dim zero vector."""
    with patch("app.ai.ollama_client.OllamaClient.embed", new_callable=AsyncMock) as mock:
        mock.return_value = [0.0] * 768
        yield mock
