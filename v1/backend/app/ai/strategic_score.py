import logging
import json
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

# 1. Keyword Weights (30%)
KEYWORDS = {
    "war": 10,
    "missile": 9,
    "border": 8,
    "terrorist": 10,
    "nuclear": 10,
    "military": 7,
    "attack": 8,
    "conflict": 8,
    "invasion": 9,
    "defense": 6,
    "nato": 7,
    "china": 6,
    "taiwan": 8,
    "russia": 6,
    "pakistan": 7,
    "cyber": 7,
    "sanctions": 6,
    "airstrike": 9
}

# 4. Region Scores (20%)
REGION_SCORES = {
    "china": 10,
    "pakistan": 10,
    "russia": 9,
    "ukraine": 9,
    "usa": 8,
    "taiwan": 9,
    "israel": 9,
    "gaza": 10,
    "iran": 9,
    "north korea": 9, # multi-word handling needed
    "india": 8
}

# 5. Source Credibility (10%)
SOURCE_SCORES = {
    "reuters": 8,
    "bbc": 8,
    "ap": 8,
    "cnn": 6,
    "fox": 6,
    "al jazeera": 6,
    "unknown": 2
}

def compute_strategic_score(article: dict, sentiment: dict, bias: dict) -> dict:
    """
    Computes a weighted strategic importance score (0-100).
    Formula:
    Strategic Score =
    (Keyword Score × 0.30)
    + (Sentiment Score × 0.20)
    + (Bias Score × 0.15)
    + (Region Score × 0.20)
    + (Source Score × 0.10)
    + (Recency Score × 0.05)
    """
    
    text = (article.get('translated_title', '') or article.get('title', '') + " " + article.get('translated_text', '') or article.get('content', '')).lower()
    
    # --- 1. Keyword Score (Max 100 before weight) ---
    keyword_score_raw = 0
    found_keywords = []
    for word, weight in KEYWORDS.items():
        if word in text:
            keyword_score_raw += weight
            found_keywords.append(word)
    # Normalize: Assuming max realistic raw score is around 40-50, we scale to 0-100
    # Let's say 40 raw points = 100 score.
    keyword_score_norm = min(100, (keyword_score_raw / 40) * 100)

    # --- 2. Sentiment Score (Max 100 before weight) ---
    # Negative (+10) -> 100, Neutral (+5) -> 50, Positive (+2) -> 20
    sentiment_label = sentiment.get('label', 'Neutral')
    if sentiment_label == 'Negative':
        sentiment_score_norm = 100 # Represents +10 relative to others
    elif sentiment_label == 'Neutral':
        sentiment_score_norm = 50  # Represents +5
    else: # Positive
        sentiment_score_norm = 20  # Represents +2

    # --- 3. Bias Score (Max 100 before weight) ---
    # Extreme (+7) -> 100, Moderate (+4) -> 60, Neutral (+1) -> 20
    bias_label = bias.get('label', 'Neutral')
    if 'Biased' in bias_label: # Assuming label might vary, simplified check
        # Needs refinement based on actual bias label output
        # If score is high (>0.8) consider extreme?
        bias_val = bias.get('score', 0)
        if bias_val > 0.8:
            bias_score_norm = 100 # Extreme
        else:
            bias_score_norm = 60 # Moderate
    else:
        bias_score_norm = 20 # Neutral
        
    # --- 4. Region Score (Max 100 before weight) ---
    region_max = 0
    found_regions = []
    for region, r_score in REGION_SCORES.items():
        if region in text:
            region_max = max(region_max, r_score)
            found_regions.append(region.title())
    
    # Map 0-10 to 0-100
    region_score_norm = region_max * 10

    # --- 5. Source Score (Max 100 before weight) ---
    source_name = article.get('source', 'Unknown').lower()
    source_val = 2 # Default
    for key, val in SOURCE_SCORES.items():
        if key in source_name:
            source_val = val
            break
    source_score_norm = source_val * 10 # 8->80, 6->60, 2->20

    # --- 6. Recency Score (Max 100 before weight) ---
    # < 6h (+10), < 24h (+7), < 3d (+4), Old (+1)
    published_at = article.get('published_at')
    recency_val = 1
    if published_at:
        try:
            if isinstance(published_at, str):
                published_at = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
            
            # Make sure both are offset-aware or both naive. 
            # Assuming published_at is aware (from news_fetcher), we use utcnow
            now = datetime.now(published_at.tzinfo) 
            
            diff = now - published_at
            hours = diff.total_seconds() / 3600
            
            if hours < 6:
                recency_val = 10
            elif hours < 24:
                recency_val = 7
            elif hours < 72:
                recency_val = 4
            else:
                recency_val = 1
        except Exception as e:
            logger.warning(f"Date parsing error for recency: {e}")
            recency_val = 1
    
    recency_score_norm = recency_val * 10

    # --- Final Calculation ---
    final_score = (
        (keyword_score_norm * 0.30) +
        (sentiment_score_norm * 0.20) +
        (bias_score_norm * 0.15) +
        (region_score_norm * 0.20) +
        (source_score_norm * 0.10) +
        (recency_score_norm * 0.05)
    )

    # Risk Level
    if final_score >= 75:
        risk_level = "Critical"
    elif final_score >= 50:
        risk_level = "High"
    elif final_score >= 25:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Summary
    key_factors = []
    if found_keywords:
        key_factors.append(f"Keywords: {', '.join(found_keywords[:3])}")
    if sentiment_label == 'Negative':
        key_factors.append("Negative sentiment detected")
    if found_regions:
        key_factors.append(f"Regions: {', '.join(found_regions)}")
    
    summary_reason = f"Weighted Score: {int(final_score)}. "
    summary_reason += f"Kwd({int(keyword_score_norm)}), Sent({int(sentiment_score_norm)}), Reg({int(region_score_norm)}), Src({int(source_score_norm)}), Rec({int(recency_score_norm)})."

    return {
        "strategic_score": int(final_score),
        "risk_level": risk_level,
        "key_factors": json.dumps(key_factors),
        "summary_reason": summary_reason
    }
