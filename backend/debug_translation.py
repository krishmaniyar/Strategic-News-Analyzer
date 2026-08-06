from deep_translator import GoogleTranslator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test(text):
    print(f"\n--- Testing: {text} ---")
    try:
        # Auto-detect source, translate to English
        translator = GoogleTranslator(source='auto', target='en')
        translated = translator.translate(text)
        print(f"Translation: {translated}")
    except Exception as e:
        print(f"Translation failed: {e}")

samples = [
    "Bonjour tout le monde",
    "Guten Tag, wie geht es Ihnen?",
    "Hola, ¿cómo estás?",
    "Привет, как дела?",
    "你好",
    "Ce projet est magnifique et fonctionne bien."
]

for s in samples:
    test(s)

samples = [
    "Bonjour tout le monde",
    "Guten Tag, wie geht es Ihnen?",
    "Hola, ¿cómo estás?",
    "Привет, как дела?",
    "你好",
    "Ce projet est magnifique et fonctionne bien."
]

for s in samples:
    test(s)
