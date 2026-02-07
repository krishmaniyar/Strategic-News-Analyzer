import hashlib

def generate_news_hash(title: str, url: str) -> str:
    """
    Generates a unique hash for a news article based on its title and URL.
    This helps in deduplicating articles.
    """
    # Normalize inputs
    title = title.strip().lower() if title else ""
    url = url.strip().lower() if url else ""
    
    # Create unique string
    unique_string = f"{title}|{url}"
    
    # Generate SHA256 hash
    return hashlib.sha256(unique_string.encode('utf-8')).hexdigest()
