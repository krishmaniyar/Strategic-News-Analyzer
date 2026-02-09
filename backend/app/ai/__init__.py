from .translation import load_translation_model, translate_text
from .sentiment import load_sentiment_model, analyze_sentiment
from .bias import load_bias_model, detect_bias
from .strategic_score import compute_strategic_score
from .pipeline import run_ai_pipeline

def load_all_models():
    """
    Loads all AI models into memory.
    """
    load_translation_model()
    load_sentiment_model()
    load_bias_model()
