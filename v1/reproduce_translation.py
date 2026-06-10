import logging
import sys
import os

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.ai.translation import load_translation_model, translate_text

# Configure logging to see what's happening
logging.basicConfig(level=logging.INFO)

def test_translation():
    print("Loading model...")
    load_translation_model()
    
    samples = [
        ("Bonjour tout le monde", "fr"),
        ("你好世界", "zh"),
        ("Привет мир", "ru"),
        ("Hola Mundo", "es"),
        ("Hello World", "en") # Should return as is
    ]

    print("\n--- Testing Translation ---")
    for text, lang in samples:
        print(f"\nInput ({lang}): {text}")
        try:
            result = translate_text(text)
            print(f"Output: {result}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_translation()
