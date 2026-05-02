"""Slug generation — no external dependency."""
import re
import unicodedata


def make_slug(text: str, max_length: int = 200) -> str:
    """Convert text to a URL-safe slug."""
    # Normalize unicode → ASCII
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = text.strip("-")
    return text[:max_length]
