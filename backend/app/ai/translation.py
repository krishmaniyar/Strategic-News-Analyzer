from deep_translator import GoogleTranslator
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_translation_model():
    """
    No-op for deep-translator as it uses an API.
    Kept for compatibility with existing calls.
    """
    logger.info("Translation provider: deep-translator (Google). No local model loading required.")

def translate_text(text: str) -> str:
    """
    Translates text to English using Google Translate via deep-translator.
    """
    if not text:
        return ""

    try:
        # Use simple heuristic to avoid unnecessary API calls for English
        # (This is basic; a proper language detector could be used but might be overkill/slow)
        # For now, let Google handle 'auto'.
        
        translator = GoogleTranslator(source='auto', target='en')
        translated = translator.translate(text)
        return translated
        
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return text
