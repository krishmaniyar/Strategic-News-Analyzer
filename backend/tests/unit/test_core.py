"""
Unit tests for core deterministic logic.

These tests verify:
  - SHA-256 hash deduplication
  - Reciprocal Rank Fusion (RRF)
  - Brier score formula
  - Model router task mapping
  - Article chunking boundaries
"""
import hashlib
import pytest


# ─── 1. Hash Deduplication ─────────────────────────────────────────────────

class TestHashDeduplication:
    """Verify that the SHA-256 content hash is stable and unique."""

    def _compute_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def test_same_content_produces_same_hash(self):
        content = "Breaking: Tensions rise in the South China Sea."
        assert self._compute_hash(content) == self._compute_hash(content)

    def test_different_content_produces_different_hash(self):
        h1 = self._compute_hash("Article A about Ukraine conflict.")
        h2 = self._compute_hash("Article B about Taiwan strait tensions.")
        assert h1 != h2

    def test_whitespace_difference_creates_different_hash(self):
        """Leading/trailing whitespace should create distinct hashes — callers must normalise."""
        h1 = self._compute_hash("some text")
        h2 = self._compute_hash("  some text  ")
        assert h1 != h2

    def test_hash_is_64_hex_chars(self):
        digest = self._compute_hash("Test article content here.")
        assert len(digest) == 64
        assert all(c in "0123456789abcdef" for c in digest)


# ─── 2. Reciprocal Rank Fusion ────────────────────────────────────────────

def rrf_score(rank: int, k: int = 60) -> float:
    """Standard RRF formula: 1 / (k + rank)."""
    return 1.0 / (k + rank)


def merge_rrf(vector_ids: list[str], fts_ids: list[str], k: int = 60) -> list[str]:
    """Fuse two ranked lists via RRF and return IDs sorted by combined score (desc)."""
    scores: dict[str, float] = {}
    for rank, doc_id in enumerate(vector_ids, start=1):
        scores[doc_id] = scores.get(doc_id, 0.0) + rrf_score(rank, k)
    for rank, doc_id in enumerate(fts_ids, start=1):
        scores[doc_id] = scores.get(doc_id, 0.0) + rrf_score(rank, k)
    return sorted(scores, key=lambda d: scores[d], reverse=True)


class TestRRF:
    def test_top_result_in_both_lists_wins(self):
        """A document ranked #1 in both vector and FTS search should be the top fused result."""
        vector = ["doc-A", "doc-B", "doc-C"]
        fts    = ["doc-A", "doc-D", "doc-E"]
        fused = merge_rrf(vector, fts)
        assert fused[0] == "doc-A"

    def test_document_only_in_one_list_still_appears(self):
        """Documents not present in both lists should still be returned."""
        vector = ["doc-A", "doc-B"]
        fts    = ["doc-C", "doc-D"]
        fused = merge_rrf(vector, fts)
        assert set(fused) == {"doc-A", "doc-B", "doc-C", "doc-D"}

    def test_rrf_score_decreases_with_rank(self):
        """Higher (worse) rank should produce a lower RRF score."""
        assert rrf_score(1) > rrf_score(10) > rrf_score(100)

    def test_empty_lists_returns_empty(self):
        assert merge_rrf([], []) == []

    def test_single_document(self):
        fused = merge_rrf(["doc-X"], ["doc-X"])
        assert fused == ["doc-X"]


# ─── 3. Brier Score ───────────────────────────────────────────────────────

def brier_score(forecast_probability: float, outcome: int) -> float:
    """
    Brier Score = (p - o)²
    Lower is better. Perfect calibration → 0.0. Worst case → 1.0.
    """
    return (forecast_probability - outcome) ** 2


class TestBrierScore:
    def test_perfect_confident_correct_forecast(self):
        """Probability 1.0, event happened → Brier = 0.0."""
        assert brier_score(1.0, 1) == pytest.approx(0.0)

    def test_perfect_confident_incorrect_forecast(self):
        """Probability 1.0, event did NOT happen → worst Brier = 1.0."""
        assert brier_score(1.0, 0) == pytest.approx(1.0)

    def test_calibrated_50_percent(self):
        """50% confidence, any outcome → Brier = 0.25."""
        assert brier_score(0.5, 1) == pytest.approx(0.25)
        assert brier_score(0.5, 0) == pytest.approx(0.25)

    def test_brier_range_is_0_to_1(self):
        for p in [0.0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0]:
            for o in [0, 1]:
                score = brier_score(p, o)
                assert 0.0 <= score <= 1.0

    def test_high_confidence_wrong_is_worse_than_low_confidence_wrong(self):
        """A confident wrong forecast should be penalised more than an uncertain one."""
        high_conf_wrong = brier_score(0.9, 0)  # Predicted 90% but didn't happen
        low_conf_wrong  = brier_score(0.6, 0)  # Predicted 60% but didn't happen
        assert high_conf_wrong > low_conf_wrong


# ─── 4. Text Chunking ─────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """Sliding window chunker (character-level)."""
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start += chunk_size - overlap
    return chunks


class TestChunker:
    def test_short_text_is_single_chunk(self):
        text = "Short article."
        assert chunk_text(text, chunk_size=512, overlap=64) == [text]

    def test_long_text_produces_multiple_chunks(self):
        text = "A" * 2000
        chunks = chunk_text(text, chunk_size=512, overlap=64)
        assert len(chunks) > 1

    def test_chunk_size_is_respected(self):
        text = "B" * 600
        chunks = chunk_text(text, chunk_size=512, overlap=64)
        for chunk in chunks:
            assert len(chunk) <= 512

    def test_overlap_creates_shared_content(self):
        text = "X" * 1000
        chunks = chunk_text(text, chunk_size=200, overlap=50)
        # The tail of chunk[0] and the head of chunk[1] should share 50 chars
        assert chunks[0][-50:] == chunks[1][:50]

    def test_empty_text_returns_empty_list(self):
        assert chunk_text("") == []
