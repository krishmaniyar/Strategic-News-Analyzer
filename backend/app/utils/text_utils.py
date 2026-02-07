import re

def clean_text(text: str) -> str:
    """
    Basic text cleaning.
    """
    if not text:
        return ""
    # Remove extra whitespaces
    return " ".join(text.split())

def normalize_title(title: str) -> str:
    """
    Normalize title for consistent processing.
    """
    if not title:
        return ""
    return title.strip()
