import hashlib

def compute_hash(title: str, url: str) -> str:
    """Compute a SHA-256 hash of (title + url) to identify exact duplicate articles.
    
    This matches the hash pattern in V1 but is now enforced as a unique key in the DB.
    """
    content = f"{title.strip().lower()}|{url.strip().lower()}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:64]
